"use client"

import { createContext, useContext, useState, useEffect } from "react"

export type Role = "SUPER_ADMIN" | "ADMIN"

interface AuthUserContextType {
  pseudo: string | null
  role: Role | null
  warehouse: string | null
  setPseudo: (p: string | null) => void
  setRole: (r: Role | null) => void
  setWarehouse: (w: string | null) => void
}

const AuthUserContext = createContext<AuthUserContextType>({
  pseudo: null,
  role: null,
  warehouse: null,
  setPseudo: () => {},
  setRole: () => {},
  setWarehouse: () => {},
})

export function AuthUserProvider({ children }: { children: React.ReactNode }) {
  const [pseudo, setPseudo] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [warehouse, setWarehouse] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json()
        return null
      })
      .then((data) => {
        if (data?.pseudo) setPseudo(data.pseudo)
        if (data?.role === "SUPER_ADMIN" || data?.role === "ADMIN") setRole(data.role)
        if (data?.warehouse !== undefined) setWarehouse(data.warehouse)
      })
      .catch(() => {})
  }, [])

  return (
    <AuthUserContext.Provider value={{ pseudo, role, warehouse, setPseudo, setRole, setWarehouse }}>
      {children}
    </AuthUserContext.Provider>
  )
}

export function useAuthUser() {
  return useContext(AuthUserContext)
}