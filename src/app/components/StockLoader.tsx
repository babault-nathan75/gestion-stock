"use client"

import { LogoStock } from "./LogoStock"

export function StockLoader({ size = 160, label = "Chargement en cours..." }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <LogoStock style={{ width: size, height: size }} className="animate-pulse" />
      {label && (
        <p className="mt-3 text-xs font-mono text-neutral-500 uppercase tracking-wider">
          {label}
        </p>
      )}
    </div>
  )
}
