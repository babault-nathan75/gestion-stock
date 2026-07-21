"use client"

import { createContext, useContext, useState, useEffect } from "react"
import type { WarehouseName } from "./types"

interface WarehouseContextType {
  warehouse: WarehouseName
  setWarehouse: (w: WarehouseName) => void
}

const WarehouseContext = createContext<WarehouseContextType>({
  warehouse: "all",
  setWarehouse: () => {},
})

export function WarehouseProvider({ children }: { children: React.ReactNode }) {
  const [warehouse, setWarehouse] = useState<WarehouseName>("all")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("warehouse") as WarehouseName
      if (saved && ["all", "Abidjan", "Sinfra"].includes(saved)) {
        setWarehouse(saved)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("warehouse", warehouse)
    } catch {}
  }, [warehouse])

  return (
    <WarehouseContext.Provider value={{ warehouse, setWarehouse }}>
      {children}
    </WarehouseContext.Provider>
  )
}

export function useWarehouse() {
  return useContext(WarehouseContext)
}
