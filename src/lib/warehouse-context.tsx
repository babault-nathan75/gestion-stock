"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { getWarehouses, FALLBACK_WAREHOUSES } from "./warehouses"
import type { WarehouseName } from "./types"

interface WarehouseContextType {
  warehouse: WarehouseName
  setWarehouse: (w: WarehouseName) => void
  warehouses: string[]
  warehouseLocked: boolean
}

const WarehouseContext = createContext<WarehouseContextType>({
  warehouse: "all",
  setWarehouse: () => {},
  warehouses: [...FALLBACK_WAREHOUSES],
  warehouseLocked: false,
})

export function WarehouseProvider({ children, forcedWarehouse }: { children: React.ReactNode; forcedWarehouse?: string | null }) {
  const [warehouse, setWarehouse] = useState<WarehouseName>("all")
  const [warehouses, setWarehouses] = useState<string[]>([...FALLBACK_WAREHOUSES])
  const warehouseLocked = Boolean(forcedWarehouse)

  useEffect(() => {
    let mounted = true
    getWarehouses().then((list) => {
      if (!mounted) return
      setWarehouses(list.length > 0 ? list : [...FALLBACK_WAREHOUSES])
      if (forcedWarehouse) {
        setWarehouse(forcedWarehouse as WarehouseName)
        return
      }
      try {
        const saved = localStorage.getItem("warehouse") as WarehouseName | null
        if (saved && (saved === "all" || list.includes(saved))) {
          setWarehouse(saved)
        }
      } catch {}
    })
    return () => {
      mounted = false
    }
  }, [forcedWarehouse])

  useEffect(() => {
    if (warehouseLocked) return
    try {
      localStorage.setItem("warehouse", warehouse)
    } catch {}
  }, [warehouse, warehouseLocked])

  return (
    <WarehouseContext.Provider value={{ warehouse, setWarehouse: warehouseLocked ? () => {} : setWarehouse, warehouses, warehouseLocked }}>
      {children}
    </WarehouseContext.Provider>
  )
}

export function useWarehouse() {
  return useContext(WarehouseContext)
}