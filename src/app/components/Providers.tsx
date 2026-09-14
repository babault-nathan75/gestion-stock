"use client"

import { WarehouseProvider } from "@/lib/warehouse-context"
import { AuthUserProvider, useAuthUser } from "@/lib/auth-context"
import { Header } from "./Header"
import { MobileNav } from "./MobileNav"
import { DesktopSidebar } from "./DesktopSidebar"
import { Toaster } from "sonner"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

function AppLayout({ children }: { children: React.ReactNode }) {
  const { setPseudo, setRole } = useAuthUser()
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
          router.replace("/login")
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data?.pseudo) {
          setPseudo(data.pseudo)
          if (data.role === "SUPER_ADMIN" || data.role === "ADMIN") setRole(data.role)
        }
        setAuthChecked(true)
      })
      .catch(() => {
        setPseudo(null)
        setRole(null)
        router.replace("/login")
      })
  }, [isLoginPage, router, pathname, setPseudo, setRole])

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <DotLottieReact
          src="https://lottie.host/f6025aed-8451-4330-a5d6-30667ed6c793/DBsncsWns3.json"
          loop
          autoplay
          style={{ width: 160, height: 160 }}
        />
      </div>
    )
  }

  return (
    <WarehouseProvider>
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
