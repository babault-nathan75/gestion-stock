"use client"

export function LogoStock({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src="/Gestock_favicon_2-removebg-preview.png"
      alt="GESTOCK"
      className={`object-contain ${className}`}
      style={style}
    />
  )
}
