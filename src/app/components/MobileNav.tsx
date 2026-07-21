"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Stock", icon: LayoutDashboard },
  { href: "/produits", label: "Produits", icon: Package },
  { href: "/categories", label: "Catégories", icon: Tag },
  { href: "/entrees", label: "Entrées", icon: ArrowDownToLine },
  { href: "/sorties", label: "Sorties", icon: ArrowUpFromLine },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 text-[9px] font-medium transition-colors rounded-lg",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-all",
                  isActive && "scale-110"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
