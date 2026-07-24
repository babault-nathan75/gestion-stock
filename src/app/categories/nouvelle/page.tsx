"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export default function NouvelleCategoriePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { toast.error("Le nom de la catégorie est requis"); return }

    setSubmitting(true)
    const { error } = await getSupabase().from("categories").insert({ name: trimmed })

    if (error) {
      if (error.code === "23505") toast.error("Cette catégorie existe déjà")
      else toast.error("Erreur lors de l'ajout")
      setSubmitting(false)
      return
    }

    toast.success("Catégorie ajoutée")
    setSubmitting(false)
    router.push("/categories")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-6 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Nouvelle catégorie</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nom *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Poudre"
              autoFocus
              className="h-11"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-800">
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-11 px-6">
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="h-11 px-8">
              {submitting ? "Enregistrement..." : "Ajouter la catégorie"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
