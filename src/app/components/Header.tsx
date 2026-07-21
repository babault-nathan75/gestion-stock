"use client"

import { useWarehouse } from "@/lib/warehouse-context"
import type { WarehouseName } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const warehouses: { value: WarehouseName; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "Abidjan", label: "Abidjan" },
  { value: "Sinfra", label: "Sinfra" },
]

export function Header() {
  const { warehouse, setWarehouse } = useWarehouse()

  return (
    <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-neutral-800">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <img src="/Gestock_favicon_2-removebg-preview.png" alt="GESTOCK" className="h-9 w-9 shrink-0 object-contain" />
          <span className="text-lg font-black tracking-wider text-yellow-500">
            GESTOCK
          </span>
        </div>
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
                ? "bg-yellow-400 text-black font-semibold shadow-sm hover:bg-yellow-300"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
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
