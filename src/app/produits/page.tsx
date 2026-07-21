"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { useWarehouse } from "@/lib/warehouse-context"
import type { Product, StockEntry, StockExit, ProductStock } from "@/lib/types"
import { ProductForm } from "../components/ProductForm"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  ArrowUpDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  X,
  Trash,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { StockLoader } from "../components/StockLoader"

type SortKey = "name" | "quantity" | "price" | "category"
type SortDir = "asc" | "desc"

interface ProductWithWarehouseQty extends Product {
  warehouse_quantity?: number
}

export default function ProduitsPage() {
  const { warehouse } = useWarehouse()
  const [products, setProducts] = useState<ProductWithWarehouseQty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("__all__")
  const [categories, setCategories] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [detailEntries, setDetailEntries] = useState<StockEntry[]>([])
  const [detailExits, setDetailExits] = useState<StockExit[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const requestIdRef = useRef(0)

  const loadProducts = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    const db = getSupabase()

    try {
      if (warehouse === "all") {
        const { data } = await db.from("products").select("*").order("name")
        if (requestId !== requestIdRef.current) return
        if (data) {
          setProducts(data as ProductWithWarehouseQty[])
          const cats = [...new Set(data.map((p: Product) => p.category).filter(Boolean))] as string[]
          setCategories(cats.sort())
        }
      } else {
        const { data } = await db
          .from("product_stock")
          .select("*, products(*)")
          .eq("warehouse", warehouse)
          .gt("quantity", 0)
        if (requestId !== requestIdRef.current) return
        if (data) {
          const mapped = data
            .filter((ps: any) => ps.products)
            .map((ps: any) => ({
              ...ps.products,
              warehouse_quantity: ps.quantity,
            })) as ProductWithWarehouseQty[]
          mapped.sort((a, b) => a.name.localeCompare(b.name))
          setProducts(mapped)
          const cats = [...new Set(mapped.map((p) => p.category).filter(Boolean))] as string[]
          setCategories(cats.sort())
        }
      }
    } catch {}
    setLoading(false)
  }, [warehouse])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    const db = getSupabase()
    const channel = db
      .channel("products-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadProducts())
      .on("postgres_changes", { event: "*", schema: "public", table: "product_stock" }, () => loadProducts())
      .subscribe()
    return () => { db.removeChannel(channel) }
  }, [loadProducts])

  async function openDetail(product: Product) {
    setDetailProduct(product)
    try {
      const db = getSupabase()
      const [entriesRes, exitsRes] = await Promise.all([
        db.from("stock_entries").select("*").eq("product_id", product.id).order("date", { ascending: false }).limit(20),
        db.from("stock_exits").select("*").eq("product_id", product.id).order("date", { ascending: false }).limit(20),
      ])
      if (entriesRes.data) setDetailEntries(entriesRes.data)
      if (exitsRes.data) setDetailExits(exitsRes.data)
    } catch {}
  }

  const filteredProducts = useMemo(() => {
    let result = products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    )
    if (categoryFilter !== "__all__") {
      result = result.filter((p) => p.category === categoryFilter)
    }
    result.sort((a, b) => {
      let cmp = 0
      if (sortKey === "name") cmp = a.name.localeCompare(b.name)
      else if (sortKey === "quantity") cmp = (a.warehouse_quantity ?? a.quantity) - (b.warehouse_quantity ?? b.quantity)
      else if (sortKey === "price") cmp = a.price - b.price
      else if (sortKey === "category") cmp = (a.category || "").localeCompare(b.category || "")
      return sortDir === "asc" ? cmp : -cmp
    })
    return result
  }, [products, search, categoryFilter, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)))
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    const db = getSupabase()
    const ids = Array.from(selectedIds)
    const { error } = await db.from("products").delete().in("id", ids)
    if (error) {
      toast.error("Erreur lors de la suppression")
    } else {
      toast.success(`${ids.length} produit${ids.length > 1 ? "s" : ""} supprimé${ids.length > 1 ? "s" : ""}`)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
      loadProducts()
    }
    setBulkDeleting(false)
  }

  function exportCSV() {
    const headers = ["Nom", "Catégorie", "Quantité", "Prix unitaire (Fcfa)", "Valeur stock (Fcfa)", "Seuil alerte"]
    const rows = filteredProducts.map((p) => {
      const qty = p.warehouse_quantity ?? p.quantity
      return [p.name, p.category || "", qty.toString(), p.price.toFixed(2), (qty * p.price).toFixed(2), (p.alert_threshold || 5).toString()]
    })
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `produits_${warehouse}_${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Export CSV téléchargé")
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditingProduct(null)
  }

  async function handleDelete() {
    if (!deleteProduct) return
    const deleted = deleteProduct
    setProducts((prev) => prev.filter((p) => p.id !== deleted.id))
    setDeleteProduct(null)
    setDeleting(true)
    const { error } = await getSupabase().from("products").delete().eq("id", deleted.id)
    if (error) {
      toast.error("Erreur, annulation...")
      loadProducts()
    } else {
      toast.success("Produit supprimé")
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <StockLoader size={120} />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? "s" : ""}
            {warehouse !== "all" ? ` · ${warehouse}` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="shrink-0">
              <Trash className="mr-1 h-4 w-4" />
              {selectedIds.size}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV} className="shrink-0">
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <Button variant="ghost" size="icon-sm" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setSearch("")}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "__all__")}>
          <SelectTrigger className="flex-1 h-9">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes les catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-lg border">
          {(["name", "quantity", "price"] as SortKey[]).map((key) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              className={`h-9 rounded-none text-xs ${sortKey === key ? "bg-muted" : ""}`}
              onClick={() => toggleSort(key)}
            >
              {key === "name" ? "Nom" : key === "quantity" ? "Qté" : "Prix"}
              {sortKey === key && <ArrowUpDown className="ml-1 h-3 w-3" />}
            </Button>
          ))}
        </div>
      </div>

      {selectedIds.size === 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{products.length} produit{products.length !== 1 ? "s" : ""}</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={toggleSelectAll}>
            Sélectionner tout
          </Button>
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {search || categoryFilter !== "__all__" ? "Aucun produit trouvé" : "Aucun produit enregistré"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product) => {
            const qty = product.warehouse_quantity ?? product.quantity
            const isSelected = selectedIds.has(product.id)
            return (
              <Card
                key={product.id}
                className={`cursor-pointer active:scale-[0.98] transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => selectedIds.size > 0 ? toggleSelect(product.id) : openDetail(product)}
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedIds.size > 0 && (
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                        {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{product.name}</p>
                        {qty <= (product.alert_threshold || 5) && (
                          <Badge variant={qty === 0 ? "destructive" : "secondary"} className="text-xs shrink-0">
                            {qty === 0 ? "Rupture" : "Bas"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {product.category && <span>{product.category}</span>}
                        {product.category && <span>·</span>}
                        <span>Qté: {qty}</span>
                        {product.price > 0 && (
                          <>
                            <span>·</span>
                            <span>{product.price.toLocaleString("fr-FR")} Fcfa</span>
                          </>
                        )}
                        <span>·</span>
                        <span className="font-medium">{(qty * product.price).toLocaleString("fr-FR")} Fcfa</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteProduct(product)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Button size="lg" className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40" onClick={() => setFormOpen(true)}>
        <Plus className="h-6 w-6" />
      </Button>

      <ProductForm open={formOpen} onOpenChange={handleFormClose} product={editingProduct} onSave={loadProducts} />

      <Dialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le produit</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer &quot;{deleteProduct?.name}&quot; ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={() => setBulkDeleteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suppression en lot</DialogTitle>
            <DialogDescription>
              Supprimer {selectedIds.size} produit{selectedIds.size > 1 ? "s" : ""} ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? "Suppression..." : `Supprimer ${selectedIds.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailProduct} onOpenChange={() => { setDetailProduct(null); setDetailEntries([]); setDetailExits([]) }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {detailProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{detailProduct.name}</DialogTitle>
                <DialogDescription>{detailProduct.category || "Sans catégorie"} · Seuil: {detailProduct.alert_threshold || 5}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-bold">{(detailProduct as any).warehouse_quantity ?? detailProduct.quantity}</p>
                    <p className="text-xs text-muted-foreground">Stock</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-bold">{detailProduct.price.toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-muted-foreground">Prix (Fcfa)</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-bold">{(((detailProduct as any).warehouse_quantity ?? detailProduct.quantity) * detailProduct.price).toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-muted-foreground">Valeur (Fcfa)</p>
                  </div>
                </div>
                {detailEntries.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1"><ArrowDownToLine className="h-4 w-4 text-success" /> Entrées récentes</h3>
                    <div className="space-y-1">
                      {detailEntries.map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <div>
                            <span className="text-muted-foreground">{format(new Date(e.date), "dd MMM", { locale: fr })}</span>
                            {e.origin && <span className="ml-1 text-xs text-muted-foreground">· {e.origin}</span>}
                            {e.warehouse && <span className="ml-1 text-xs text-primary">· {e.warehouse}</span>}
                          </div>
                          <span className="font-medium text-success">+{e.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailExits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1"><ArrowUpFromLine className="h-4 w-4 text-warning" /> Sorties récentes</h3>
                    <div className="space-y-1">
                      {detailExits.map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <div>
                            <span className="text-muted-foreground">{format(new Date(e.date), "dd MMM", { locale: fr })}</span>
                            {e.destination && <span className="ml-1 text-xs text-muted-foreground">· {e.destination}</span>}
                            {e.warehouse && <span className="ml-1 text-xs text-primary">· {e.warehouse}</span>}
                          </div>
                          <span className="font-medium text-destructive">-{e.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailEntries.length === 0 && detailExits.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun mouvement enregistré</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
