"use client"

import { createContext, useContext, useState, useEffect } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem("theme") as Theme
      if (saved === "dark" || saved === "light") {
        setTheme(saved)
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark")
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem("theme", theme)
    } catch {}
  }, [theme, mounted])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
