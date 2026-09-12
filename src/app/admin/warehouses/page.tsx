"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthUser } from "@/lib/auth-context"
import { invalidateWarehouses } from "@/lib/warehouses"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { StockLoader } from "@/app/components/StockLoader"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Warehouse, Plus, Pencil, Trash2, ShieldCheck } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"

interface WarehouseRow {
  id: string
  name: string
  created_at: string
}

export default function AdminWarehousesPage() {
  const { role } = useAuthUser()
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<WarehouseRow | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await fetch("/api/warehouses")
      if (!res.ok) {
        setWarehouses([])
        return
      }
      const data = await res.json()
      setWarehouses(Array.isArray(data) ? data : [])
    } catch {
      setWarehouses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (role === "SUPER_ADMIN") Promise.resolve().then(() => loadWarehouses())
  }, [role, loadWarehouses])

  if (role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h1 className="text-xl font-bold">Accès réservé</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Seul le super-administrateur peut gérer les entrepôts.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  function openCreate() {
    setEditing(null)
    setName("")
    setDialogOpen(true)
  }

  function openEdit(warehouse: WarehouseRow) {
    setEditing(warehouse)
    setName(warehouse.name)
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Le nom de l'entrepôt est requis")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/warehouses/${editing.id}` : "/api/warehouses", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'enregistrement")
        return
      }
      toast.success(editing ? "Entrepôt renommé" : "Entrepôt créé")
      invalidateWarehouses()
      setDialogOpen(false)
      loadWarehouses()
    } catch {
      toast.error("Erreur de réseau")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(warehouse: WarehouseRow) {
    if (!window.confirm(`Supprimer l'entrepôt "${warehouse.name}" ?`)) return
    try {
      const res = await fetch(`/api/warehouses/${warehouse.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la suppression")
        return
      }
      toast.success("Entrepôt supprimé")
      invalidateWarehouses()
      loadWarehouses()
    } catch {
      toast.error("Erreur de réseau")
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Entrepôts</h1>
          <p className="text-sm text-muted-foreground">
            {warehouses.length} entrepôt{warehouses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <StockLoader size={80} />
        </div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Warehouse className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <p>Aucun entrepôt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {warehouses.map((warehouse) => (
            <Card key={warehouse.id} className="bg-card">
              <CardContent className="flex items-center justify-between p-4 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Warehouse className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-white truncate">{warehouse.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Créé le {format(new Date(warehouse.created_at), "dd MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(warehouse)} aria-label="Renommer">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(warehouse)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <Badge variant="secondary" className="mr-1">Info</Badge>
        Un entrepôt contenant du stock ou des mouvements ne peut pas être supprimé.
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Renommer l'entrepôt" : "Nouvel entrepôt"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Le renommage sera répercuté sur tous les mouvements et stocks liés."
                : "Ajoutez un nouveau lieu de stockage."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="warehouse-name">Nom *</Label>
              <Input
                id="warehouse-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Paris"
                className="h-10"
                autoFocus
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                Annuler
              </Button>
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}