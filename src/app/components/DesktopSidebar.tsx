"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { Package, LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Tag, Warehouse, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWarehouse } from "@/lib/warehouse-context"
import { useAuthUser } from "@/lib/auth-context"

const navItems = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/produits", label: "Produits", icon: Package },
  { href: "/categories", label: "Catégories", icon: Tag },
  { href: "/entrees", label: "Entrées", icon: ArrowDownToLine },
  { href: "/sorties", label: "Sorties", icon: ArrowUpFromLine },
]

export function DesktopSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { warehouse, setWarehouse, warehouses } = useWarehouse()
  const { pseudo } = useAuthUser()

  const options = [
    { value: "all", label: "Tous les entrepôts" },
    ...warehouses.map((name) => ({ value: name, label: name })),
  ]

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col border-r border-neutral-800 bg-neutral-950 sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800 shrink-0">
        <img src="/Gestock_favicon_2-removebg-preview.png" alt="GESTOCK" className="h-8 w-8 shrink-0 object-contain" />
        <span className="text-lg font-black tracking-wider text-yellow-500">GESTOCK</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-neutral-800 px-3 py-4">
        <div className="flex items-center gap-2 px-3 mb-2">
          <Warehouse className="h-4 w-4 text-neutral-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Entrepôts</span>
        </div>
        <div className="space-y-0.5">
          {options.map((w) => (
            <button
              key={w.value}
              onClick={() => setWarehouse(w.value)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                warehouse === w.value
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              )}
            >
              <div className={cn(
                "h-2.5 w-2.5 rounded-full shrink-0",
                warehouse === w.value ? "bg-yellow-400" : "bg-neutral-600"
              )} />
              <span>{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-800 p-3">
        {pseudo && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-yellow-400" />
            </div>
            <span className="text-sm font-medium text-white truncate">{pseudo}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
