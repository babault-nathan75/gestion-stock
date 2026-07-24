"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface AuthUserContextType {
  pseudo: string | null
  setPseudo: (p: string | null) => void
}

const AuthUserContext = createContext<AuthUserContextType>({
  pseudo: null,
  setPseudo: () => {},
})

export function AuthUserProvider({ children }: { children: React.ReactNode }) {
  const [pseudo, setPseudo] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json()
        return null
      })
      .then((data) => {
        if (data?.pseudo) setPseudo(data.pseudo)
      })
      .catch(() => {})
  }, [])

  return (
    <AuthUserContext.Provider value={{ pseudo, setPseudo }}>
      {children}
    </AuthUserContext.Provider>
  )
}

export function useAuthUser() {
  return useContext(AuthUserContext)
}
