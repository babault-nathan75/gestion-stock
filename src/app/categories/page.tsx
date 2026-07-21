"use client"

import { useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase"
import type { Category } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Tag } from "lucide-react"
import { toast } from "sonner"
import { StockLoader } from "../components/StockLoader"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    try {
      const db = getSupabase()
      const { data } = await db
        .from("categories")
        .select("*")
        .order("name")
      if (data) setCategories(data)
    } catch {}
    setLoading(false)
  }

  function handleEdit(category: Category) {
    setEditingCategory(category)
    setCategoryName(category.name)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditingCategory(null)
    setCategoryName("")
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditingCategory(null)
    setCategoryName("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = categoryName.trim()
    if (!trimmed) {
      toast.error("Le nom de la catégorie est requis")
      return
    }

    setSubmitting(true)
    const db = getSupabase()

    if (editingCategory) {
      const { error } = await db
        .from("categories")
        .update({ name: trimmed })
        .eq("id", editingCategory.id)

      if (error) {
        if (error.code === "23505") {
          toast.error("Cette catégorie existe déjà")
        } else {
          toast.error("Erreur lors de la modification")
        }
        setSubmitting(false)
        return
      }
      toast.success("Catégorie modifiée")
    } else {
      const { error } = await db
        .from("categories")
        .insert({ name: trimmed })

      if (error) {
        if (error.code === "23505") {
          toast.error("Cette catégorie existe déjà")
        } else {
          toast.error("Erreur lors de l'ajout")
        }
        setSubmitting(false)
        return
      }
      toast.success("Catégorie ajoutée")
    }

    setSubmitting(false)
    handleClose()
    loadCategories()
  }

  async function handleDelete() {
    if (!deleteCategory) return
    setDeleting(true)
    const db = getSupabase()
    const { error } = await db
      .from("categories")
      .delete()
      .eq("id", deleteCategory.id)

    if (error) {
      toast.error("Erreur lors de la suppression")
      setDeleting(false)
      return
    }

    toast.success("Catégorie supprimée")
    setDeleteCategory(null)
    setDeleting(false)
    loadCategories()
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
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Catégories</h1>
        <p className="text-sm text-muted-foreground">
          {categories.length} catégorie{categories.length !== 1 ? "s" : ""}
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Tag className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aucune catégorie enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Tag className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium">{category.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteCategory(category)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button
        size="lg"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={handleAdd}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={formOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Modifiez le nom de la catégorie"
                : "Ajoutez une nouvelle catégorie de produit"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nom *</Label>
              <Input
                id="cat-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ex: Poudre"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Enregistrement..."
                  : editingCategory
                    ? "Modifier"
                    : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer &quot;{deleteCategory?.name}&quot; ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategory(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
