"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { getWarehouses, FALLBACK_WAREHOUSES } from "./warehouses"
import type { WarehouseName } from "./types"

interface WarehouseContextType {
  warehouse: WarehouseName
  setWarehouse: (w: WarehouseName) => void
  warehouses: string[]
}

const WarehouseContext = createContext<WarehouseContextType>({
  warehouse: "all",
  setWarehouse: () => {},
  warehouses: [...FALLBACK_WAREHOUSES],
})

export function WarehouseProvider({ children }: { children: React.ReactNode }) {
  const [warehouse, setWarehouse] = useState<WarehouseName>("all")
  const [warehouses, setWarehouses] = useState<string[]>([...FALLBACK_WAREHOUSES])

  useEffect(() => {
    let mounted = true
    getWarehouses().then((list) => {
      if (!mounted) return
      setWarehouses(list.length > 0 ? list : [...FALLBACK_WAREHOUSES])
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
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("warehouse", warehouse)
    } catch {}
  }, [warehouse])

  return (
    <WarehouseContext.Provider value={{ warehouse, setWarehouse, warehouses }}>
      {children}
    </WarehouseContext.Provider>
  )
}

export function useWarehouse() {
  return useContext(WarehouseContext)
}