"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { useWarehouse } from "@/lib/warehouse-context"
import { useAuthUser } from "@/lib/auth-context"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export default function NouveauProduitPage() {
  const router = useRouter()
  const { warehouse: ctxWarehouse, warehouses } = useWarehouse()
  const { pseudo } = useAuthUser()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [price, setPrice] = useState("0")
  const [quantity, setQuantity] = useState("0")
  const [alertThreshold, setAlertThreshold] = useState("5")
  const [warehouse, setWarehouse] = useState(ctxWarehouse === "all" ? (warehouses[0] ?? "Abidjan") : ctxWarehouse)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    getSupabase().from("categories").select("*").order("name").then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error("Le nom du produit est requis"); return }

    setLoading(true)
    const db = getSupabase()
    const qty = parseInt(quantity) || 0

    const { data: newProduct, error: createError } = await db
      .from("products")
      .insert({
        name: name.trim(),
        category: category === "__none__" ? null : category,
        price: parseFloat(price) || 0,
        quantity: qty,
        alert_threshold: parseInt(alertThreshold) || 5,
        created_by: pseudo || null,
      })
      .select("id")
      .single()

    if (createError) {
      toast.error(`Erreur ajout: ${createError.message}`)
      setLoading(false)
      return
    }

    if (qty > 0) {
      await db.from("product_stock").insert({ product_id: newProduct.id, warehouse, quantity: qty })
    }

    toast.success("Produit ajouté")
    setLoading(false)
    router.push("/produits")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-6 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Nouveau produit</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Dental drop" className="h-11" />
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "__none__")}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sans catégorie</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prix unitaire (Fcfa)</Label>
              <Input id="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Stock initial</Label>
              <Input id="quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label>Entrepôt</Label>
              <Select value={warehouse} onValueChange={(v) => setWarehouse(v ?? "Abidjan")}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Le stock initial sera attribué à cet entrepôt</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Seuil d&apos;alerte stock bas</Label>
              <Input id="threshold" type="number" min="0" value={alertThreshold} onChange={(e) => setAlertThreshold(e.target.value)} className="h-11" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-800">
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-11 px-6">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="h-11 px-8">
              {loading ? "Enregistrement..." : "Ajouter le produit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
