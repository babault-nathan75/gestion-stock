"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { useWarehouse } from "@/lib/warehouse-context"
import type { Product, StockEntry, StockExit } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Coins,
  BarChart3,
  Trophy,
  RefreshCw,
} from "lucide-react"
import { format, subDays } from "date-fns"
import { fr } from "date-fns/locale"
import { PullToRefresh } from "./components/PullToRefresh"
import { StockLoader } from "./components/StockLoader"

export default function DashboardPage() {
  const { warehouse } = useWarehouse()
  const [products, setProducts] = useState<Product[]>([])
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [exits, setExits] = useState<StockExit[]>([])
  const [allEntries, setAllEntries] = useState<StockEntry[]>([])
  const [allExits, setAllExits] = useState<StockExit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const requestIdRef = useRef(0)

  const loadData = useCallback(async (isRefresh = false) => {
    const requestId = ++requestIdRef.current
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    const db = getSupabase()

    try {
      const baseQuery = (table: string) => {
        let q = db.from(table).select("*, products(name)")
        if (warehouse !== "all") q = q.eq("warehouse", warehouse)
        return q
      }

      const baseAllQuery = (table: string) => {
        let q = db.from(table).select("*")
        if (warehouse !== "all") q = q.eq("warehouse", warehouse)
        return q
      }

      let productsQuery = db.from("products").select("*").order("name")
      if (warehouse !== "all") {
        productsQuery = db.from("product_stock").select("*, products(*)").eq("warehouse", warehouse).gt("quantity", 0)
      }

      const [productsRes, entriesRes, exitsRes, allEntriesRes, allExitsRes] = await Promise.all([
        productsQuery,
        baseQuery("stock_entries").order("created_at", { ascending: false }).limit(5),
        baseQuery("stock_exits").order("created_at", { ascending: false }).limit(5),
        baseAllQuery("stock_entries").gte("date", format(subDays(new Date(), 30), "yyyy-MM-dd")),
        baseAllQuery("stock_exits").gte("date", format(subDays(new Date(), 30), "yyyy-MM-dd")),
      ])

      if (requestId !== requestIdRef.current) return

      if (warehouse === "all") {
        if (productsRes.data) setProducts(productsRes.data)
      } else {
        if (productsRes.data) {
          const mapped = productsRes.data
            .filter((ps: any) => ps.products)
            .map((ps: any) => ({
              ...ps.products,
              quantity: ps.quantity,
            }))
          setProducts(mapped as Product[])
        }
      }
      if (entriesRes.data) setEntries(entriesRes.data)
      if (exitsRes.data) setExits(exitsRes.data)
      if (allEntriesRes.data) setAllEntries(allEntriesRes.data)
      if (allExitsRes.data) setAllExits(allExitsRes.data)
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [warehouse])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const db = getSupabase()
    const channel = db
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_entries" }, () => loadData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_exits" }, () => loadData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadData(true))
      .subscribe()
    return () => { db.removeChannel(channel) }
  }, [loadData])

  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0)
  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.price, 0)
  const lowStockProducts = products.filter((p) => p.quantity <= (p.alert_threshold || 5))

  const valueByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products) {
      const cat = p.category || "Sans catégorie"
      map.set(cat, (map.get(cat) || 0) + p.quantity * p.price)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([, v]) => v > 0)
  }, [products])

  const topProducts = useMemo(() => {
    return [...products]
      .filter((p) => p.price > 0)
      .sort((a, b) => b.quantity * b.price - a.quantity * a.price)
      .slice(0, 5)
  }, [products])

  const chartData = useMemo(() => {
    const days: { date: string; label: string; entries: number; exits: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i)
      const dateStr = format(d, "yyyy-MM-dd")
      const label = format(d, "EEE", { locale: fr })
      const dayEntries = allEntries.filter((e) => e.date === dateStr).reduce((s, e) => s + e.quantity, 0)
      const dayExits = allExits.filter((e) => e.date === dateStr).reduce((s, e) => s + e.quantity, 0)
      days.push({ date: dateStr, label, entries: dayEntries, exits: dayExits })
    }
    return days
  }, [allEntries, allExits])

  const maxChartValue = useMemo(() => {
    return Math.max(1, ...chartData.map((d) => Math.max(d.entries, d.exits)))
  }, [chartData])

  if (loading) {
    return <div className="flex items-center justify-center p-8"><StockLoader size={120} /></div>
  }

  return (
    <PullToRefresh onRefresh={() => loadData(true)}>
      <div className="space-y-4 p-4 animate-fade-in bg-zinc-950 text-zinc-100 min-h-screen">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
            <p className="text-sm text-zinc-400">
              Vue d&apos;ensemble {warehouse !== "all" ? `· ${warehouse}` : ""}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="border-zinc-800 bg-zinc-900 text-yellow-400 hover:bg-zinc-800 hover:text-yellow-300"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-zinc-900/80 border-zinc-800 shadow-sm">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Package className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalProducts}</p>
                <p className="text-xs text-zinc-400">Produits</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800 shadow-sm">
            <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400/10 border border-yellow-500/20">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStock}</p>
                <p className="text-xs text-zinc-400">En stock</p>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 bg-zinc-900/80 border-zinc-800 shadow-sm">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Coins className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{totalValue.toLocaleString("fr-FR")} Fcfa</p>
                <p className="text-xs text-zinc-400">Valeur du stock</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {chartData.some((d) => d.entries > 0 || d.exits > 0) && (
          <Card className="bg-zinc-900/80 border-zinc-800 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-yellow-400" />
                <h2 className="font-semibold text-sm text-white">Entrées / Sorties (7 jours)</h2>
              </div>
              <div className="flex items-end gap-1 h-28">
                {chartData.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: "80%" }}>
                      <div
                        className="flex-1 bg-yellow-400 rounded-t-sm min-h-[2px] transition-all"
                        style={{ height: `${maxChartValue > 0 ? (d.entries / maxChartValue) * 100 : 0}%` }}
                      />
                      <div
                        className="flex-1 bg-red-500 rounded-t-sm min-h-[2px] transition-all"
                        style={{ height: `${maxChartValue > 0 ? (d.exits / maxChartValue) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400">{d.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 justify-center text-xs text-zinc-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Entrées</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Sorties</span>
              </div>
            </CardContent>
          </Card>
        )}

        {valueByCategory.length > 0 && (
          <Card className="bg-zinc-900/80 border-zinc-800 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <h2 className="font-semibold text-sm text-white">Valeur par catégorie</h2>
              <div className="space-y-2">
                {valueByCategory.map(([cat, value]) => {
                  const pct = totalValue > 0 ? (value / totalValue) * 100 : 0
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-200">{cat}</span>
                        <span className="font-medium text-yellow-400">{value.toLocaleString("fr-FR")} Fcfa</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {topProducts.length > 0 && (
          <Card className="bg-zinc-900/80 border-zinc-800 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <h2 className="font-semibold text-sm text-white">Top produits (par valeur)</h2>
              </div>
              <div className="space-y-1">
                {topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-zinc-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-yellow-500 w-4">{i + 1}</span>
                      <span className="text-zinc-200">{p.name}</span>
                    </div>
                    <span className="font-medium text-yellow-400">{(p.quantity * p.price).toLocaleString("fr-FR")} Fcfa</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {lowStockProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <h2 className="font-semibold text-white">Stock bas</h2>
              <Badge variant="destructive" className="text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                {lowStockProducts.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <Card key={product.id} className="bg-zinc-900/80 border-zinc-800">
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-xs text-zinc-400">
                        {product.category || "Sans catégorie"} · Seuil: {product.alert_threshold || 5} · {(product.quantity * product.price).toLocaleString("fr-FR")} Fcfa
                      </p>
                    </div>
                    <Badge
                      variant={product.quantity === 0 ? "destructive" : "secondary"}
                      className={`text-sm ${
                        product.quantity === 0 
                          ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                          : "bg-zinc-800 text-yellow-400 border border-yellow-500/20"
                      }`}
                    >
                      {product.quantity}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="font-semibold text-white">Mouvements récents</h2>
          {entries.length === 0 && exits.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">
              Aucun mouvement enregistré
            </p>
          ) : (
            <div className="space-y-2">
              {[...entries, ...exits]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 8)
                .map((item) => {
                  const isEntry = "origin" in item
                  const entry = item as StockEntry
                  const exit = item as StockExit
                  return (
                    <Card key={item.id} className="bg-zinc-900/80 border-zinc-800">
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            isEntry ? "bg-yellow-400/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20"
                          }`}>
                            {isEntry ? (
                              <TrendingUp className="h-4 w-4 text-yellow-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{(item.products as any)?.name || "Produit"}</p>
                            <p className="text-xs text-zinc-400">
                              {isEntry ? `De: ${entry.origin}` : `${exit.destination} · ${exit.recipient}`}
                              {" · "}
                              {item.warehouse && <>{item.warehouse} · </>}
                              {format(new Date(item.date), "dd MMM", { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={isEntry ? "bg-yellow-400/10 text-yellow-400 border border-yellow-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}
                        >
                          {isEntry ? "+" : "-"}{item.quantity}
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  )
}