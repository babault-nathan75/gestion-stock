"use client"

import { useWarehouse } from "@/lib/warehouse-context"
import { useTheme } from "@/lib/theme-context"
import type { WarehouseName } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

const warehouses: { value: WarehouseName; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "Abidjan", label: "Abidjan" },
  { value: "Sinfra", label: "Sinfra" },
]

export function Header() {
  const { warehouse, setWarehouse } = useWarehouse()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <img src="/Gestock_favicon_2-removebg-preview.png" alt="GESTOCK" className="h-9 w-9 shrink-0 object-contain drop-shadow-[0_0_6px_rgba(250,204,21,0.25)]" />
          <span className="text-lg font-black tracking-wider text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">
            GESTOCK
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="h-8 w-8 text-yellow-400 hover:bg-zinc-900 hover:text-yellow-300"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex gap-1.5 px-4 pb-2">
        {warehouses.map((w) => (
          <Button
            key={w.value}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 rounded-full text-xs px-3 font-medium transition-all",
              warehouse === w.value
                ? "bg-yellow-400 text-zinc-950 font-semibold shadow-[0_0_10px_rgba(250,204,21,0.3)] hover:bg-yellow-300"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            )}
            onClick={() => setWarehouse(w.value)}
          >
            {w.label}
          </Button>
        ))}
      </div>
    </div>
  )
}