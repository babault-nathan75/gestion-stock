"use client"

import Link from "next/link"
import { useAuthUser } from "@/lib/auth-context"
import { Users, Warehouse, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function AdminPage() {
  const { role } = useAuthUser()

  if (role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-bold">Administration</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Cette section est réservée au super-administrateur.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sections = [
    {
      href: "/admin/users",
      label: "Admins",
      description: "Gérer les comptes (pseudo, mot de passe, rôle)",
      icon: Users,
    },
    {
      href: "/admin/warehouses",
      label: "Entrepôts",
      description: "Créer, renommer ou supprimer un entrepôt",
      icon: Warehouse,
    },
  ]

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-sm text-muted-foreground">Gestion réservée au super-administrateur</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="bg-card hover:border-primary/40 transition-colors h-full">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10")}>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{section.label}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card className="bg-card">
        <CardContent className="p-5 space-y-2">
          <h2 className="font-semibold">Entrées & Sorties</h2>
          <p className="text-sm text-muted-foreground">
            En tant que super-admin, vous pouvez <strong>modifier ou supprimer</strong> un lot de mouvement
            directement depuis les pages Entrées et Sorties (le stock est réajusté automatiquement).
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/entrees"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-primary/40"
            >
              <ArrowDownToLine className="h-4 w-4 text-success" /> Entrées
            </Link>
            <Link
              href="/sorties"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-primary/40"
            >
              <ArrowUpFromLine className="h-4 w-4 text-destructive" /> Sorties
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}