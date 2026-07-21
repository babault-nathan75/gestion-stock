"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { useWarehouse } from "@/lib/warehouse-context"
import type { Product, StockExit } from "@/lib/types"
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
import { Plus, ArrowUpFromLine, Trash2 } from "lucide-react"
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
  destination: string
  recipient: string
  warehouse: string
  date: string
  notes: string | null
  lines: StockExit[]
}

export default function SortiesPage() {
  const { warehouse: ctxWarehouse } = useWarehouse()
  const [exits, setExits] = useState<StockExit[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [destination, setDestination] = useState("")
  const [recipient, setRecipient] = useState("")
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
    let exitsQ = db.from("stock_exits").select("*, products(name)").order("date", { ascending: false })
    if (ctxWarehouse !== "all") exitsQ = exitsQ.eq("warehouse", ctxWarehouse)
    const [exitsRes, productsRes] = await Promise.all([exitsQ, db.from("products").select("*").order("name")])
    if (requestId !== requestIdRef.current) return
    if (exitsRes.data) setExits(exitsRes.data)
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
    setLoading(false)
  }, [ctxWarehouse])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (ctxWarehouse !== "all") setWarehouse(ctxWarehouse)
  }, [ctxWarehouse])

  useEffect(() => {
    const db = getSupabase()
    const channel = db.channel("exits-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_exits" }, () => loadData())
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
    setDestination("")
    setRecipient("")
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
    if (!destination.trim()) { toast.error("La destination est requise"); return }
    if (!recipient.trim()) { toast.error("Le réceptionnaire est requis"); return }
    const validLines = lines.filter((l) => (l.product_id || l.product_name) && l.quantity && parseInt(l.quantity) > 0)
    if (validLines.length === 0) { toast.error("Ajoutez au moins un produit avec une quantité"); return }

    for (const line of validLines) {
      if (line.product_id && line.product_id !== "__new__") {
        const stock = getStock(line.product_id)
        if (parseInt(line.quantity) > stock) {
          const p = products.find((p) => p.id === line.product_id)
          toast.error(`Stock insuffisant pour ${p?.name || "ce produit"}. Disponible: ${stock}`)
          return
        }
      }
    }

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
      rows.push({ batch_id: batchId, product_id: productId, quantity: parseInt(line.quantity), unit_price: parseFloat(line.unit_price) || 0, warehouse, destination: destination.trim(), recipient: recipient.trim(), date, notes: notes.trim() || null })
    }

    const { error } = await db.from("stock_exits").insert(rows)
    if (error) { console.error("Stock exits insert error:", error, rows); toast.error(`Erreur: ${error.message}`); setSubmitting(false); return }
    toast.success(`${validLines.length} produit${validLines.length > 1 ? "s" : ""} expédié${validLines.length > 1 ? "s" : ""}`)
    resetForm(); setSubmitting(false); setFormOpen(false); loadData()
  }

  function groupByBatch(items: StockExit[]): BatchGroup[] {
    const map = new Map<string, BatchGroup>()
    for (const item of items) {
      const existing = map.get(item.batch_id)
      if (existing) existing.lines.push(item)
      else map.set(item.batch_id, { batch_id: item.batch_id, destination: item.destination, recipient: item.recipient, warehouse: item.warehouse, date: item.date, notes: item.notes, lines: [item] })
    }
    return Array.from(map.values())
  }

  const grouped = groupByBatch(exits)

  if (loading) {
    return <div className="flex items-center justify-center p-8"><StockLoader size={120} /></div>
  }

  return (
    <div className="space-y-4 p-4 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Sorties de stock</h1>
        <p className="text-sm text-muted-foreground">
          {exits.length} produit{exits.length !== 1 ? "s" : ""} expédié{exits.length !== 1 ? "s" : ""}
          {ctxWarehouse !== "all" ? ` · ${ctxWarehouse}` : ""}
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ArrowUpFromLine className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aucune sortie enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <Card key={group.batch_id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                      <ArrowUpFromLine className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Destination: {group.destination}</p>
                      <p className="text-xs text-muted-foreground">Réceptionnaire: {group.recipient}</p>
                      <p className="text-xs text-muted-foreground">{group.warehouse} · {format(new Date(group.date), "dd MMMM yyyy", { locale: fr })}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive shrink-0">
                    {group.lines.length} produit{group.lines.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="ml-13 space-y-1">
                  {group.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between text-sm">
                      <span>{(line.products as any)?.name || "Produit supprimé"}</span>
                      <div className="flex items-center gap-2">
                        {line.unit_price > 0 && <span className="text-xs text-muted-foreground">{line.unit_price.toLocaleString("fr-FR")} Fcfa</span>}
                        <span className="font-medium text-destructive">-{line.quantity}</span>
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
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-lg [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <DialogHeader>
            <DialogTitle>Nouvelle sortie</DialogTitle>
            <DialogDescription>Expédier un ou plusieurs produits</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date et Réceptionnaire : 1 col sur mobile, 2 cols sur écran sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exit-date">Date *</Label>
                <Input id="exit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipient">Réceptionnaire *</Label>
                <Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Nom" className="w-full" />
              </div>
            </div>

            {/* Lieu de destination */}
            <div className="space-y-1.5">
              <Label htmlFor="destination">Lieu de destination *</Label>
              <Input id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex: Cocody, Bouaké, Trechville, Sinfra..." className="w-full" />
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
                        <ProductCombobox 
                          value={line.product_id} 
                          onValueChange={(id, name) => { 
                            updateLine(line.key, "product_id", id); 
                            if (name) updateLine(line.key, "product_name", name);
                          }} 
                          products={products} 
                          placeholder="Sélectionner ou saisir" 
                        />
                      </div>
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

                    {/* Ligne 2 : Quantité et Prix unitaire */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground font-medium">Quantité</span>
                        <Input 
                          type="number" 
                          min="1" 
                          max={line.product_id && line.product_id !== "__new__" ? getStock(line.product_id) : undefined}
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

                    {/* Stock disponible */}
                    {line.product_id && line.product_id !== "__new__" && (
                      <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                        Stock disponible : <span className="font-medium text-foreground">{getStock(line.product_id)}</span>
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
