"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { useWarehouse } from "@/lib/warehouse-context"
import type { Product, StockEntry } from "@/lib/types"
import { ProductCombobox } from "../components/ProductCombobox"
import { BottomSheet } from "../components/BottomSheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, ArrowDownToLine, Trash2, Package, MapPin, CalendarDays } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"
import { StockLoader } from "../components/StockLoader"

interface FormLine {
  key: string
  product_id: string
  product_name: string
  quantity: string
  unit_price: string
}

interface BatchGroup {
  batch_id: string
  origin: string
  warehouse: string
  date: string
  notes: string | null
  lines: StockEntry[]
}

export default function EntreesPage() {
  const { warehouse: ctxWarehouse } = useWarehouse()
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [origin, setOrigin] = useState("")
  const [warehouse, setWarehouse] = useState(ctxWarehouse === "all" ? "Abidjan" : ctxWarehouse)
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<FormLine[]>([
    { key: crypto.randomUUID(), product_id: "", product_name: "", quantity: "", unit_price: "" },
  ])
  const requestIdRef = useRef(0)

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    const db = getSupabase()

    try {
      let entriesQ = db.from("stock_entries").select("*, products(name)").order("date", { ascending: false })
      if (ctxWarehouse !== "all") entriesQ = entriesQ.eq("warehouse", ctxWarehouse)
      const [entriesRes, productsRes] = await Promise.all([entriesQ, db.from("products").select("*").order("name")])
      if (requestId !== requestIdRef.current) return
      if (entriesRes.data) setEntries(entriesRes.data)
      let prods = productsRes.data || []
      if (ctxWarehouse !== "all") {
        const stockRes = await db.from("product_stock").select("product_id, quantity").eq("warehouse", ctxWarehouse)
        if (requestId !== requestIdRef.current) return
        if (stockRes.data) {
          const stockMap = new Map(stockRes.data.map((s: any) => [s.product_id, s.quantity]))
          prods = prods.map(p => ({ ...p, quantity: stockMap.get(p.id) || 0 }))
        }
      }
      setProducts(prods)
    } catch {}
    setLoading(false)
  }, [ctxWarehouse])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (ctxWarehouse !== "all") setWarehouse(ctxWarehouse)
  }, [ctxWarehouse])

  useEffect(() => {
    const db = getSupabase()
    const channel = db.channel("entries-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_entries" }, () => loadData())
      .subscribe()
    return () => { db.removeChannel(channel) }
  }, [loadData])

  function addLine() {
    setLines([...lines, { key: crypto.randomUUID(), product_id: "", product_name: "", quantity: "", unit_price: "" }])
  }

  function removeLine(key: string) {
    if (lines.length <= 1) return
    setLines(lines.filter((l) => l.key !== key))
  }

  function updateLine(key: string, field: keyof FormLine, value: string) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)))
  }

  function resetForm() {
    setOrigin("")
    setWarehouse(ctxWarehouse === "all" ? "Abidjan" : ctxWarehouse)
    setDate(format(new Date(), "yyyy-MM-dd"))
    setNotes("")
    setLines([{ key: crypto.randomUUID(), product_id: "", product_name: "", quantity: "", unit_price: "" }])
  }

  function handleClose() { resetForm(); setFormOpen(false) }

  function getStock(productId: string): number {
    return products.find((p) => p.id === productId)?.quantity || 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!origin.trim()) { toast.error("La provenance est requise"); return }
    const validLines = lines.filter((l) => (l.product_id || l.product_name) && l.quantity && parseInt(l.quantity) > 0)
    if (validLines.length === 0) { toast.error("Ajoutez au moins un produit avec une quantité"); return }

    setSubmitting(true)
    const db = getSupabase()
    const batchId = crypto.randomUUID()
    const rows: any[] = []

    for (const line of validLines) {
      let productId = line.product_id
      if (productId === "__new__") {
        const price = parseFloat(line.unit_price) || 0
        const { data: newProduct, error: createError } = await db.from("products").insert({ name: line.product_name.trim(), quantity: 0, price }).select("id").single()
        if (createError) { toast.error(`Erreur création "${line.product_name}": ${createError.message}`); setSubmitting(false); return }
        productId = newProduct.id
      }
      rows.push({ batch_id: batchId, product_id: productId, quantity: parseInt(line.quantity), unit_price: parseFloat(line.unit_price) || 0, warehouse, origin: origin.trim(), date, notes: notes.trim() || null })
    }

    const { error } = await db.from("stock_entries").insert(rows)
    if (error) { console.error("Stock entries insert error:", error, rows); toast.error(`Erreur: ${error.message}`); setSubmitting(false); return }
    toast.success(`${validLines.length} produit${validLines.length > 1 ? "s" : ""} enregistré${validLines.length > 1 ? "s" : ""}`)
    resetForm(); setSubmitting(false); setFormOpen(false); loadData()
  }

  function groupByBatch(items: StockEntry[]): BatchGroup[] {
    const map = new Map<string, BatchGroup>()
    for (const item of items) {
      const existing = map.get(item.batch_id)
      if (existing) existing.lines.push(item)
      else map.set(item.batch_id, { batch_id: item.batch_id, origin: item.origin, warehouse: item.warehouse, date: item.date, notes: item.notes, lines: [item] })
    }
    return Array.from(map.values())
  }

  const grouped = groupByBatch(entries)

  if (loading) {
    return <div className="flex items-center justify-center p-8"><StockLoader size={120} /></div>
  }

  return (
    <div className="space-y-3 p-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Entrées de stock</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} entrée{entries.length !== 1 ? "s" : ""}
            {ctxWarehouse !== "all" ? ` · ${ctxWarehouse}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-success/10 text-success">
            +{entries.length}
          </Badge>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <ArrowDownToLine className="h-10 w-10 text-success/60" />
          </div>
          <p className="text-lg font-semibold">Aucune entrée</p>
          <p className="text-sm text-muted-foreground mt-1">Appuyez sur + pour réceptionner des produits</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const totalQty = group.lines.reduce((s, l) => s + l.quantity, 0)
            const totalValue = group.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
            return (
              <div key={group.batch_id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                        <ArrowDownToLine className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-white">{group.origin}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-neutral-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{group.warehouse}
                          </span>
                          <span className="text-xs text-neutral-400 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />{format(new Date(group.date), "dd MMM", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-success/10 text-success border-0">{totalQty} unités</Badge>
                  </div>

                  <div className="space-y-1.5 ml-[52px]">
                    {group.lines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between text-sm py-1.5 border-t border-neutral-800/50 first:border-0">
                        <span className="text-neutral-300 truncate mr-2">{(line.products as any)?.name || "Produit supprimé"}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {line.unit_price > 0 && <span className="text-xs text-neutral-500">{line.unit_price.toLocaleString("fr-FR")} Fcfa</span>}
                          <span className="font-bold text-success text-sm">+{line.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {group.notes && (
                    <p className="ml-[52px] text-xs text-neutral-500 italic mt-2">{group.notes}</p>
                  )}

                  {totalValue > 0 && (
                    <div className="ml-[52px] mt-2 pt-2 border-t border-neutral-800/50">
                      <span className="text-xs text-neutral-500">Total : </span>
                      <span className="text-xs font-semibold text-yellow-400">{totalValue.toLocaleString("fr-FR")} Fcfa</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Button
        size="lg"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-yellow-400 text-black hover:bg-yellow-300"
        onClick={() => setFormOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <BottomSheet open={formOpen} onClose={handleClose} title="Nouvelle entrée" description="Réceptionner des produits">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="entry-date" className="text-sm">Date *</Label>
                <Input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="origin" className="text-sm">Provenance *</Label>
                <Input id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Fournisseur" className="h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Entrepôt *</Label>
              <Select value={warehouse} onValueChange={(v) => setWarehouse(v ?? "Abidjan")}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Abidjan">Abidjan</SelectItem>
                  <SelectItem value="Sinfra">Sinfra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produits</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-8 text-xs gap-1 border-neutral-700">
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, i) => (
                <div key={line.key} className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-400 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <ProductCombobox
                        value={line.product_id}
                        onValueChange={(id, name) => {
                          updateLine(line.key, "product_id", id)
                          if (name) updateLine(line.key, "product_name", name)
                        }}
                        products={products}
                        placeholder="Sélectionner un produit"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length <= 1}
                      className="shrink-0 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <span className="text-[11px] text-neutral-500 font-medium">Quantité *</span>
                      <Input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                        placeholder="Qté"
                        className="h-10 bg-neutral-800 border-neutral-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-neutral-500 font-medium">Prix unitaire</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => updateLine(line.key, "unit_price", e.target.value)}
                        placeholder="Fcfa"
                        className="h-10 bg-neutral-800 border-neutral-700"
                      />
                    </div>
                  </div>

                  {line.product_id && line.product_id !== "__new__" && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 pt-2 border-t border-neutral-800/50">
                      <Package className="h-3 w-3" />
                      <span>Stock actuel :</span>
                      <span className="font-semibold text-white">{getStock(line.product_id)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles"
              rows={2}
              className="bg-neutral-900 border-neutral-800"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base font-semibold bg-yellow-400 text-black hover:bg-yellow-300"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Enregistrement...
              </span>
            ) : (
              "Enregistrer l'entrée"
            )}
          </Button>
        </form>
      </BottomSheet>
    </div>
  )
}
