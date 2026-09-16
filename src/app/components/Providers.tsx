"use client"

import { WarehouseProvider } from "@/lib/warehouse-context"
import { AuthUserProvider, useAuthUser } from "@/lib/auth-context"
import { Header } from "./Header"
import { MobileNav } from "./MobileNav"
import { DesktopSidebar } from "./DesktopSidebar"
import { Toaster } from "sonner"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

function AppLayout({ children }: { children: React.ReactNode }) {
  const { setPseudo, setRole, setWarehouse: setAuthWarehouse, warehouse: authWarehouse } = useAuthUser()
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"
  const [authChecked, setAuthChecked] = useState(isLoginPage)

  useEffect(() => {
    if (isLoginPage) {
      setAuthChecked(true)
      return
    }
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          setPseudo(null)
          setRole(null)
          setAuthWarehouse(null)
          router.replace("/login")
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data?.pseudo) {
          setPseudo(data.pseudo)
          if (data.role === "SUPER_ADMIN" || data.role === "ADMIN") setRole(data.role)
          if (data.warehouse !== undefined) setAuthWarehouse(data.warehouse)
        }
        setAuthChecked(true)
      })
      .catch(() => {
        setPseudo(null)
        setRole(null)
        setAuthWarehouse(null)
        router.replace("/login")
      })
  }, [isLoginPage, router, pathname, setPseudo, setRole, setAuthWarehouse])

  if (isLoginPage) {
    return (
      <>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </>
    )
  }

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#09090B" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", border: "2px solid rgba(234,179,8,0.15)", borderTopColor: "#EAB308", animation: "spin 1s linear infinite" }} />
          <img src="/Gestock_favicon_2-removebg-preview.png" alt="GESTOCK" style={{ width: 56, height: 56, objectFit: "contain" }} />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    )
  }

  return (
    <WarehouseProvider forcedWarehouse={authWarehouse}>
      <div className="flex min-h-screen">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="md:hidden">
            <Header />
          </div>
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <Toaster position="top-center" richColors closeButton />
    </WarehouseProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  return (
    <AuthUserProvider>
      <AppLayout>{children}</AppLayout>
    </AuthUserProvider>
  )
}
