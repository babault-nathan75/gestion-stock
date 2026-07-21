"use client"

import { useState, useEffect } from "react"

export function AppLoader() {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show")

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fade"), 2000)
    const hideTimer = setTimeout(() => setPhase("done"), 2500)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  if (phase === "done") return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #09090B, #18181B, #27272A)",
        opacity: phase === "fade" ? 0 : 1,
        transition: "opacity 0.5s",
        pointerEvents: phase === "fade" ? "none" : "auto",
      }}
    >
      <img src="/Gestock.png" alt="GESTOCK" className="w-40 h-40 object-contain" />
      <p style={{ marginTop: 12, fontFamily: "system-ui, sans-serif", fontSize: 13, color: "rgba(234,179,8,.7)", textTransform: "uppercase", letterSpacing: 3 }}>
        Chargement
      </p>
    </div>
  )
}
