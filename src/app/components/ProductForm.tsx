"use client"

import { useState, useEffect, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { useWarehouse } from "@/lib/warehouse-context"
import type { Product, Category, ProductStock } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { toast } from "sonner"

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSave: () => void
}

export function ProductForm({ open, onOpenChange, product, onSave }: ProductFormProps) {
  const { warehouse: ctxWarehouse } = useWarehouse()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [price, setPrice] = useState("0")
  const [quantity, setQuantity] = useState("0")
  const [alertThreshold, setAlertThreshold] = useState("5")
  const [warehouse, setWarehouse] = useState(ctxWarehouse === "all" ? "Abidjan" : ctxWarehouse)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouseStock, setWarehouseStock] = useState<ProductStock[]>([])

  const isEditing = !!product

  const warehouseRef = useRef(ctxWarehouse === "all" ? "Abidjan" : ctxWarehouse)
  warehouseRef.current = ctxWarehouse === "all" ? "Abidjan" : ctxWarehouse

  useEffect(() => {
    if (open) {
      loadCategories()
      if (product) {
        setName(product.name || "")
        setCategory(product.category || "__none__")
        setPrice(product.price?.toString() || "0")
        setQuantity(product.quantity?.toString() || "0")
        setAlertThreshold(product.alert_threshold?.toString() || "5")
        loadWarehouseStock(product.id)
      } else {
        resetForm()
        setWarehouseStock([])
        setWarehouse(warehouseRef.current)
      }
    }
  }, [open, product])

  async function loadCategories() {
    try {
      const { data } = await getSupabase().from("categories").select("*").order("name")
      if (data) setCategories(data)
    } catch {}
  }

  async function loadWarehouseStock(productId: string) {
    try {
      const { data } = await getSupabase()
        .from("product_stock")
        .select("*")
        .eq("product_id", productId)
      if (data) setWarehouseStock(data)
    } catch {}
  }

  function resetForm() {
    setName("")
    setCategory("__none__")
    setPrice("0")
    setQuantity("0")
    setAlertThreshold("5")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Le nom du produit est requis")
      return
    }

    setLoading(true)

    const qty = parseInt(quantity) || 0
    const db = getSupabase()

    if (isEditing) {
      const { error } = await db
        .from("products")
        .update({
          name: name.trim(),
          category: category === "__none__" ? null : category,
          price: parseFloat(price) || 0,
          alert_threshold: parseInt(alertThreshold) || 5,
        })
        .eq("id", product!.id)
      if (error) {
        toast.error(`Erreur modification: ${error.message}`)
        setLoading(false)
        return
      }
      toast.success("Produit modifié")
    } else {
      const { data: newProduct, error: createError } = await db
        .from("products")
        .insert({
          name: name.trim(),
          category: category === "__none__" ? null : category,
          price: parseFloat(price) || 0,
          quantity: qty,
          alert_threshold: parseInt(alertThreshold) || 5,
        })
        .select("id")
        .single()
      if (createError) {
        toast.error(`Erreur ajout: ${createError.message}`)
        setLoading(false)
        return
      }
      if (qty > 0) {
        await db.from("product_stock").insert({
          product_id: newProduct.id,
          warehouse,
          quantity: qty,
        })
      }
      toast.success("Produit ajouté")
    }

    resetForm()
    setLoading(false)
    onSave()
    onOpenChange(false)
  }

  function handleClose() {
    resetForm()
    onOpenChange(false)
  }

  const totalStock = warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du produit"
              : "Ajoutez un nouveau produit au stock"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Dental drop"
            />
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "__none__")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sans catégorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Prix unitaire (Fcfa)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Stock initial</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isEditing}
              />
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label>Entrepôt</Label>
              <Select value={warehouse} onValueChange={(v) => setWarehouse(v ?? "Abidjan")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Abidjan">Abidjan</SelectItem>
                  <SelectItem value="Sinfra">Sinfra</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Le stock initial sera attribué à cet entrepôt
              </p>
            </div>
          )}

          {isEditing && warehouseStock.length > 0 && (
            <div className="space-y-2">
              <Label>Stock par entrepôt</Label>
              <div className="flex gap-2">
                {warehouseStock.map((ws) => (
                  <div key={ws.warehouse} className="flex-1 rounded-lg border p-2 text-center">
                    <p className="text-lg font-bold">{ws.quantity}</p>
                    <p className="text-xs text-muted-foreground">{ws.warehouse}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Total: {totalStock}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="threshold">Seuil d&apos;alerte stock bas</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : isEditing ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
