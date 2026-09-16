"use client"

import { useState, useEffect } from "react"

export function AppLoader() {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show")

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fade"), 2800)
    const hideTimer = setTimeout(() => setPhase("done"), 3300)
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
        background: "#09090B",
        opacity: phase === "fade" ? 0 : 1,
        transition: "opacity 0.5s ease-out",
        pointerEvents: phase === "fade" ? "none" : "auto",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: "50%",
            border: "2px solid rgba(234,179,8,0.15)",
            borderTopColor: "#EAB308",
            animation: "spin 1s linear infinite",
          }}
        />
        <img
          src="/Gestock_favicon_2-removebg-preview.png"
          alt="GESTOCK"
          style={{
            width: 80,
            height: 80,
            objectFit: "contain",
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
      </div>

      <div style={{ marginTop: 28, textAlign: "center" }}>
        <p
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 22,
            fontWeight: 900,
            color: "#EAB308",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          GESTOCK
        </p>
        <p
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 11,
            color: "rgba(234,179,8,0.5)",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginTop: 6,
          }}
        >
          Chargement
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.8; } }
      ` }} />
    </div>
  )
}
