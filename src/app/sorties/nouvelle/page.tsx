"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { useWarehouse } from "@/lib/warehouse-context"
import { useAuthUser } from "@/lib/auth-context"
import type { Product } from "@/lib/types"
import { ProductCombobox } from "../../components/ProductCombobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface FormLine {
  key: string
  product_id: string
  product_name: string
  quantity: string
  unit_price: string
}

interface ProductWithWarehouseQty extends Product {
  warehouse_quantity: number
}

export default function NouvelleSortiePage() {
  const router = useRouter()
  const { warehouse: ctxWarehouse } = useWarehouse()
  const { pseudo } = useAuthUser()
  const [products, setProducts] = useState<ProductWithWarehouseQty[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [destination, setDestination] = useState("")
  const [recipient, setRecipient] = useState("")
  const [warehouse, setWarehouse] = useState(ctxWarehouse === "all" ? "Abidjan" : ctxWarehouse)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<FormLine[]>([
    { key: crypto.randomUUID(), product_id: "", product_name: "", quantity: "", unit_price: "" },
  ])

  const loadProducts = useCallback(async () => {
    const db = getSupabase()
    try {
      const { data } = await db
        .from("product_stock")
        .select("*, products(*)")
        .eq("warehouse", warehouse)
        .gt("quantity", 0)
      if (data) {
        const mapped = data
          .filter((ps: any) => ps.products)
          .map((ps: any) => ({
            ...ps.products,
            warehouse_quantity: ps.quantity,
          })) as ProductWithWarehouseQty[]
        mapped.sort((a, b) => a.name.localeCompare(b.name))
        setProducts(mapped)
      }
    } catch {}
  }, [warehouse])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    if (ctxWarehouse !== "all") setWarehouse(ctxWarehouse)
  }, [ctxWarehouse])

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

  function getStock(productId: string): number {
    return products.find((p) => p.id === productId)?.warehouse_quantity || 0
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
      rows.push({ batch_id: batchId, product_id: productId, quantity: parseInt(line.quantity), unit_price: parseFloat(line.unit_price) || 0, warehouse, destination: destination.trim(), recipient: recipient.trim(), date, notes: notes.trim() || null, created_by: pseudo || null })
    }

    const { error } = await db.from("stock_exits").insert(rows)
    if (error) { toast.error(`Erreur: ${error.message}`); setSubmitting(false); return }
    toast.success(`${validLines.length} produit${validLines.length > 1 ? "s" : ""} expédié${validLines.length > 1 ? "s" : ""}`)
    setSubmitting(false)
    router.push("/sorties")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-6 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Nouvelle sortie</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="exit-date">Date *</Label>
              <Input id="exit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Réceptionnaire *</Label>
              <Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Nom" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Lieu de destination *</Label>
              <Input id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex: Cocody, Bouaké..." className="h-11" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Entrepôt *</Label>
            <Select value={warehouse} onValueChange={(v) => setWarehouse(v ?? "Abidjan")}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Abidjan">Abidjan</SelectItem>
                <SelectItem value="Sinfra">Sinfra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Produits *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-9 gap-1">
                <Plus className="h-4 w-4" /> Ajouter un produit
              </Button>
            </div>

            <div className="space-y-4">
              {lines.map((line, idx) => (
                <div key={line.key} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      {line.product_id === "__new__" ? (
                        <Input
                          value={line.product_name}
                          onChange={(e) => updateLine(line.key, "product_name", e.target.value)}
                          placeholder="Nom du nouveau produit"
                          className="w-full border-primary h-11"
                          autoFocus
                        />
                      ) : (
                        <ProductCombobox
                          value={line.product_id}
                          onValueChange={(id, pname) => {
                            updateLine(line.key, "product_id", id)
                            if (pname) updateLine(line.key, "product_name", pname)
                          }}
                          products={products}
                          placeholder="Sélectionner ou saisir"
                          warehouse={warehouse}
                        />
                      )}
                    </div>
                    {line.product_id === "__new__" && (
                      <Button type="button" variant="outline" size="sm" onClick={() => { updateLine(line.key, "product_id", ""); updateLine(line.key, "product_name", "") }} className="shrink-0 h-9 px-3">
                        Annuler
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.key)} disabled={lines.length <= 1} className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Quantité</span>
                      <Input
                        type="number"
                        min="1"
                        max={line.product_id && line.product_id !== "__new__" ? getStock(line.product_id) : undefined}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                        placeholder="Qté"
                        className="h-11"
                      />
                    </div>

                  {line.product_id && line.product_id !== "__new__" && (
                    <p className="text-xs text-muted-foreground pt-2 border-t border-neutral-800">
                      Stock disponible : <span className="font-medium text-foreground">{getStock(line.product_id)}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes optionnelles" rows={3} className="resize-none" />
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-800">
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-11 px-6">
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="h-11 px-8">
              {submitting ? "Enregistrement..." : "Enregistrer la sortie"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
