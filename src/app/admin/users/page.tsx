"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthUser, type Role } from "@/lib/auth-context"
import { useWarehouse } from "@/lib/warehouse-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PinInput } from "@/components/ui/pin-input"
import { StockLoader } from "@/app/components/StockLoader"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Users, Plus, Pencil, Trash2, ShieldCheck } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"

interface Admin {
  id: string
  pseudo: string
  role: Role
  warehouse: string | null
  created_by: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const { role, pseudo: currentPseudo } = useAuthUser()
  const { warehouses } = useWarehouse()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Admin | null>(null)
  const [pseudo, setPseudo] = useState("")
  const [password, setPassword] = useState("")
  const [adminRole, setAdminRole] = useState<Role>("ADMIN")
  const [adminWarehouse, setAdminWarehouse] = useState<string>("__all__")
  const [saving, setSaving] = useState(false)

  const loadAdmins = useCallback(async () => {
    try {
      const res = await fetch("/api/admins")
      if (!res.ok) {
        setAdmins([])
        return
      }
      const data = await res.json()
      setAdmins(Array.isArray(data) ? data : [])
    } catch {
      setAdmins([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (role === "SUPER_ADMIN") Promise.resolve().then(() => loadAdmins())
  }, [role, loadAdmins])

  if (role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h1 className="text-xl font-bold">Accès réservé</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Seul le super-administrateur peut gérer les comptes.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  function openCreate() {
    setEditing(null)
    setPseudo("")
    setPassword("")
    setAdminRole("ADMIN")
    setAdminWarehouse("__all__")
    setDialogOpen(true)
  }

  function openEdit(admin: Admin) {
    setEditing(admin)
    setPseudo(admin.pseudo)
    setPassword("")
    setAdminRole(admin.role)
    setAdminWarehouse(admin.warehouse || "__all__")
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!pseudo.trim()) {
      toast.error("Le pseudo est requis")
      return
    }
    if (!editing && password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères")
      return
    }
    if (editing && password.length > 0 && password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        pseudo: pseudo.trim(),
        role: adminRole,
        warehouse: adminWarehouse === "__all__" ? null : adminWarehouse,
      }
      if (password) {
        const formatted = password.length === 6
          ? `${password.slice(0, 2)}-${password.slice(2, 4)}-${password.slice(4, 6)}`
          : password
        body.password = formatted
      }

      const res = await fetch(editing ? `/api/admins/${editing.id}` : "/api/admins", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'enregistrement")
        return
      }
      toast.success(editing ? "Compte modifié" : "Compte créé")
      setDialogOpen(false)
      loadAdmins()
    } catch {
      toast.error("Erreur de réseau")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(admin: Admin) {
    if (admin.pseudo === currentPseudo) {
      toast.error("Vous ne pouvez pas supprimer votre propre compte")
      return
    }
    if (!window.confirm(`Supprimer le compte "${admin.pseudo}" ?`)) return
    try {
      const res = await fetch(`/api/admins/${admin.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la suppression")
        return
      }
      toast.success("Compte supprimé")
      loadAdmins()
    } catch {
      toast.error("Erreur de réseau")
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Admins</h1>
          <p className="text-sm text-muted-foreground">
            {admins.length} compte{admins.length !== 1 ? "s" : ""}
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
      ) : admins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Users className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <p>Aucun compte administrateur en base</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <Card key={admin.id} className="bg-card">
              <CardContent className="flex items-center justify-between p-4 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white truncate">{admin.pseudo}</p>
                    <Badge
                      variant="secondary"
                      className={
                        admin.role === "SUPER_ADMIN"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                          : "bg-primary/10 text-primary border border-primary/30"
                      }
                    >
                      {admin.role === "SUPER_ADMIN" ? "Super-admin" : "Admin"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Créé le {format(new Date(admin.created_at), "dd MMMM yyyy", { locale: fr })}
                    {admin.created_by ? ` · par ${admin.created_by}` : ""}
                    {admin.warehouse ? ` · Entrepôt: ${admin.warehouse}` : " · Tous les entrepôts"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(admin)} aria-label="Modifier">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(admin)}
                    disabled={admin.pseudo === currentPseudo}
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

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le compte" : "Nouveau compte"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez le pseudo, le rôle ou le mot de passe." : "Créez un compte administrateur."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-pseudo">Pseudo *</Label>
              <Input
                id="admin-pseudo"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="pseudo"
                className="h-10"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Mot de passe {editing ? "(vide = inchangé)" : "*"}
              </Label>
              <div className="flex justify-center">
                <PinInput value={password} onChange={setPassword} />
              </div>
              {!editing && (
                <p className="text-xs text-muted-foreground text-center">6 chiffres</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select value={adminRole} onValueChange={(v) => setAdminRole((v === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super-admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {adminRole === "ADMIN" && (
              <div className="space-y-1.5">
                <Label>Entrepôt assigné</Label>
                <Select value={adminWarehouse} onValueChange={(v) => setAdminWarehouse(v ?? "__all__")}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous les entrepôts</SelectItem>
                    {warehouses.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  L&apos;admin ne verra que les données de cet entrepôt
                </p>
              </div>
            )}

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