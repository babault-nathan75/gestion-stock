"use client"

import { useState, useEffect } from "react"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

export function AppLoader() {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show")

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fade"), 2500)
    const hideTimer = setTimeout(() => setPhase("done"), 3000)
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
      <DotLottieReact
        src="https://lottie.host/f6025aed-8451-4330-a5d6-30667ed6c793/DBsncsWns3.json"
        loop
        autoplay
        style={{ width: 200, height: 200 }}
      />
      <p style={{ marginTop: 12, fontFamily: "system-ui, sans-serif", fontSize: 13, color: "rgba(234,179,8,.7)", textTransform: "uppercase", letterSpacing: 3 }}>
        Chargement
      </p>
    </div>
  )
}
