"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PinInput } from "@/components/ui/pin-input"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [pseudo, setPseudo] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Convert 8 digits "27042005" to "27-04-2005" (DD-MM-YYYY)
    const formattedPassword = password.length === 8 
      ? `${password.slice(0,2)}-${password.slice(2,4)}-${password.slice(4,8)}` 
      : password
    if (!pseudo.trim() || password.length < 8) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudo.trim(), password: formattedPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Identifiants incorrects")
        setLoading(false)
        return
      }

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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pseudo">Pseudo</Label>
            <Input
              id="pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
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
      </div>
    </div>
  )
}
