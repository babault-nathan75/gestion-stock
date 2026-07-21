"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { useWarehouse } from "@/lib/warehouse-context"
import type { Product, StockEntry } from "@/lib/types"
import { ProductCombobox } from "../components/ProductCombobox"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, ArrowDownToLine, Trash2 } from "lucide-react"
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
    <div className="space-y-4 p-4 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Entrées de stock</h1>
        <p className="text-sm text-muted-foreground">
          {entries.length} produit{entries.length !== 1 ? "s" : ""} réceptionné{entries.length !== 1 ? "s" : ""}
          {ctxWarehouse !== "all" ? ` · ${ctxWarehouse}` : ""}
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ArrowDownToLine className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aucune entrée enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <Card key={group.batch_id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
                      <ArrowDownToLine className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Provenance: {group.origin}</p>
                      <p className="text-xs text-muted-foreground">{group.warehouse} · {format(new Date(group.date), "dd MMMM yyyy", { locale: fr })}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-success/10 text-success shrink-0">
                    {group.lines.length} produit{group.lines.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="ml-13 space-y-1">
                  {group.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between text-sm">
                      <span>{(line.products as any)?.name || "Produit supprimé"}</span>
                      <div className="flex items-center gap-2">
                        {line.unit_price > 0 && <span className="text-xs text-muted-foreground">{line.unit_price.toLocaleString("fr-FR")} Fcfa</span>}
                        <span className="font-medium text-success">+{line.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {group.notes && <p className="ml-13 text-xs text-muted-foreground italic">{group.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button size="lg" className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40" onClick={() => setFormOpen(true)}>
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={formOpen} onOpenChange={handleClose}>
        {/* Correction apportée ici : overflow-y-visible pour laisser le menu déroulant du combobox flotter proprement par-dessus */}
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-visible overflow-x-hidden p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle entrée</DialogTitle>
            <DialogDescription>Réceptionner un ou plusieurs produits</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Date et Provenance : 1 colonne sur très petit écran, 2 sur écran normal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="entry-date">Date *</Label>
                <Input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="origin">Provenance *</Label>
                <Input id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Fournisseur" className="w-full" />
              </div>
            </div>

            {/* Entrepôt */}
            <div className="space-y-1.5">
              <Label>Entrepôt *</Label>
              <Select value={warehouse} onValueChange={(v) => setWarehouse(v ?? "Abidjan")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Abidjan">Abidjan</SelectItem>
                  <SelectItem value="Sinfra">Sinfra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section Produits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Produits *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-8 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.key} className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm space-y-2">
                    {/* Ligne 1 : Sélection Produit + Bouton Supprimer */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        {line.product_id === "__new__" ? (
                          <Input
                            value={line.product_name}
                            onChange={(e) => updateLine(line.key, "product_name", e.target.value)}
                            placeholder="Nom du nouveau produit"
                            className="w-full border-primary focus-visible:ring-primary h-9"
                            autoFocus
                          />
                        ) : (
                          <ProductCombobox 
                            value={line.product_id} 
                            onValueChange={(id, name) => { 
                              updateLine(line.key, "product_id", id); 
                              if (name) updateLine(line.key, "product_name", name);
                            }} 
                            products={products} 
                            placeholder="Sélectionner un produit" 
                          />
                        )}
                      </div>
                      
                      {/* Bouton d'annulation affiché seulement lors de la création d'un nouveau produit */}
                      {line.product_id === "__new__" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateLine(line.key, "product_id", "");
                            updateLine(line.key, "product_name", "");
                          }}
                          className="shrink-0 h-9 px-2 text-xs"
                        >
                          Annuler
                        </Button>
                      )}

                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeLine(line.key)} 
                        disabled={lines.length <= 1} 
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Ligne 2 : Quantité et Prix unitaire côte à côte */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground font-medium">Quantité</span>
                        <Input 
                          type="number" 
                          min="1" 
                          value={line.quantity} 
                          onChange={(e) => updateLine(line.key, "quantity", e.target.value)} 
                          placeholder="Qté" 
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground font-medium">Prix unitaire</span>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          value={line.unit_price} 
                          onChange={(e) => updateLine(line.key, "unit_price", e.target.value)} 
                          placeholder="Prix" 
                        />
                      </div>
                    </div>

                    {/* Stock actuel */}
                    {line.product_id && line.product_id !== "__new__" && (
                      <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                        Stock actuel : <span className="font-medium text-foreground">{getStock(line.product_id)}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes optionnelles" rows={2} />
            </div>

            {/* Footer adaptable mobile */}
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}