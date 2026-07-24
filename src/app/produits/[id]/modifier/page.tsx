"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import type { Product, Category, ProductStock } from "@/lib/types"
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

export default function ModifierProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [price, setPrice] = useState("0")
  const [alertThreshold, setAlertThreshold] = useState("5")
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouseStock, setWarehouseStock] = useState<ProductStock[]>([])

  useEffect(() => {
    async function load() {
      const db = getSupabase()
      const [prodRes, catRes, stockRes] = await Promise.all([
        db.from("products").select("*").eq("id", id).single(),
        db.from("categories").select("*").order("name"),
        db.from("product_stock").select("*").eq("product_id", id),
      ])
      if (prodRes.data) {
        setName(prodRes.data.name || "")
        setCategory(prodRes.data.category || "__none__")
        setPrice(prodRes.data.price?.toString() || "0")
        setAlertThreshold(prodRes.data.alert_threshold?.toString() || "5")
      }
      if (catRes.data) setCategories(catRes.data)
      if (stockRes.data) setWarehouseStock(stockRes.data)
      setLoadingData(false)
    }
    load()
  }, [id])

  const totalStock = warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error("Le nom du produit est requis"); return }

    setLoading(true)
    const { error } = await getSupabase()
      .from("products")
      .update({
        name: name.trim(),
        category: category === "__none__" ? null : category,
        price: parseFloat(price) || 0,
        alert_threshold: parseInt(alertThreshold) || 5,
      })
      .eq("id", id)

    if (error) {
      toast.error(`Erreur modification: ${error.message}`)
      setLoading(false)
      return
    }

    toast.success("Produit modifié")
    setLoading(false)
    router.push("/produits")
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-6 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Modifier le produit</h1>
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
              <Label htmlFor="threshold">Seuil d&apos;alerte stock bas</Label>
              <Input id="threshold" type="number" min="0" value={alertThreshold} onChange={(e) => setAlertThreshold(e.target.value)} className="h-11" />
            </div>
          </div>

          {warehouseStock.length > 0 && (
            <div className="space-y-2">
              <Label>Stock par entrepôt</Label>
              <div className="grid grid-cols-2 gap-3">
                {warehouseStock.map((ws) => (
                  <div key={ws.warehouse} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center">
                    <p className="text-2xl font-bold text-white">{ws.quantity}</p>
                    <p className="text-sm text-muted-foreground">{ws.warehouse}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground text-center">Total: {totalStock}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-neutral-800">
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-11 px-6">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="h-11 px-8">
              {loading ? "Enregistrement..." : "Modifier le produit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
