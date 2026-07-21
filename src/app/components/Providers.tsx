"use client"

import { useEffect } from "react"
import { WarehouseProvider } from "@/lib/warehouse-context"
import { ThemeProvider } from "@/lib/theme-context"
import { Header } from "./Header"
import { MobileNav } from "./MobileNav"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  return (
    <ThemeProvider>
      <WarehouseProvider>
        <main className="mx-auto max-w-lg min-h-screen">
          <Header />
          {children}
          <div className="h-20" />
        </main>
        <MobileNav />
        <Toaster position="top-center" richColors closeButton />
      </WarehouseProvider>
    </ThemeProvider>
  )
}
