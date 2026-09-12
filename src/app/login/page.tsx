"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PinInput } from "@/components/ui/pin-input"
import { useAuthUser } from "@/lib/auth-context"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const { setPseudo, setRole } = useAuthUser()
  const [mode, setMode] = useState<"admin" | "super">("admin")
  const [pseudo, setPseudoInput] = useState("")
  const [password, setPassword] = useState("")
  const [superPassword, setSuperPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === "super") {
      if (!superPassword.trim()) {
        toast.error("Veuillez saisir le mot de passe")
        return
      }
    } else {
      if (!pseudo.trim() || password.length < 8) {
        toast.error("Veuillez remplir tous les champs")
        return
      }
    }

    setLoading(true)
    try {
      const body =
        mode === "super"
          ? JSON.stringify({ password: superPassword.trim() })
          : JSON.stringify({
              pseudo: pseudo.trim(),
              password:
                password.length === 8
                  ? `${password.slice(0, 2)}-${password.slice(2, 4)}-${password.slice(4, 8)}`
                  : password,
            })

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Identifiants incorrects")
        setLoading(false)
        return
      }

      if (data.pseudo) setPseudo(data.pseudo)
      if (data.role === "SUPER_ADMIN" || data.role === "ADMIN") setRole(data.role)

      router.push("/")
      router.refresh()
    } catch {
      toast.error("Erreur de connexion")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <img src="/Gestock_favicon_2-removebg-preview.png" alt="GESTOCK" className="h-16 w-16 mx-auto object-contain" />
          <h1 className="text-2xl font-black tracking-wider text-yellow-500">GESTOCK</h1>
          <p className="text-sm text-muted-foreground">Gestion de Stock</p>
        </div>

        <div className="flex rounded-lg border border-border p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode("admin")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "admin" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setMode("super")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "super" ? "bg-yellow-500/10 text-yellow-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Super-admin
          </button>
        </div>

        {mode === "admin" ? (
          <form key="admin" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pseudo">Pseudo</Label>
              <Input
                id="pseudo"
                value={pseudo}
                onChange={(e) => setPseudoInput(e.target.value)}
                placeholder="Votre pseudo"
                autoFocus
                autoComplete="username"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <div className="flex justify-center">
                <PinInput value={password} onChange={setPassword} />
              </div>
            </div>
            <Button type="submit" disabled={loading || password.length < 8} className="w-full h-11">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        ) : (
          <form key="super" onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-xs text-muted-foreground">
              Connexion réservée au super-administrateur (mot de passe uniquement).
            </div>
            <div className="space-y-2">
              <Label htmlFor="super-password">Mot de passe secret</Label>
              <Input
                id="super-password"
                type="password"
                value={superPassword}
                onChange={(e) => setSuperPassword(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            <Button type="submit" disabled={loading || !superPassword.trim()} className="w-full h-11">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}