"use client"

import { useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
}

export function PinInput({ value, onChange, length = 6, disabled }: PinInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const [focused, setFocused] = useState(false)

  const chunks = [
    { start: 0, count: 2 },
    { start: 2, count: 2 },
    { start: 4, count: 2 },
  ]

  const handleChange = useCallback((index: number, val: string) => {
    if (disabled) return
    const digits = val.replace(/\D/g, "")
    if (digits.length > 1) {
      const chars = digits.split("")
      const newValue = value.split("")
      let hi = index
      for (const c of chars) {
        if (hi < length) {
          newValue[hi] = c
          hi++
        }
      }
      const joined = newValue.join("").slice(0, length)
      onChange(joined)
      const nextIdx = Math.min(hi, length - 1)
      inputs.current[nextIdx]?.focus()
      return
    }

    const newValue = value.split("")
    newValue[index] = digits
    const joined = newValue.join("")
    onChange(joined)

    if (digits && index < length - 1) {
      inputs.current[index + 1]?.focus()
    }
  }, [value, onChange, length, disabled])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        const newValue = value.split("")
        newValue[index - 1] = ""
        onChange(newValue.join(""))
        inputs.current[index - 1]?.focus()
      } else {
        const newValue = value.split("")
        newValue[index] = ""
        onChange(newValue.join(""))
      }
      e.preventDefault()
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputs.current[index + 1]?.focus()
    }
  }, [value, onChange, length, disabled])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (disabled) return
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (pasted) {
      onChange(pasted.padEnd(length, ""))
      const nextIdx = Math.min(pasted.length, length - 1)
      inputs.current[nextIdx]?.focus()
    }
  }, [onChange, length, disabled])

  return (
    <div className="flex items-center gap-0" onPaste={handlePaste}>
      {chunks.map((chunk, ci) => (
        <div key={ci} className="flex">
          {Array.from({ length: chunk.count }).map((_, i) => {
            const idx = chunk.start + i
            return (
              <input
                key={idx}
                ref={(el) => { inputs.current[idx] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={value[idx] || ""}
                disabled={disabled}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className={cn(
                  "w-10 h-12 text-center text-lg font-bold rounded-lg border bg-neutral-900 text-white outline-none transition-all",
                  "focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20",
                  value[idx] ? "border-yellow-500/40" : "border-neutral-700",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
            )
          })}
          {ci < chunks.length - 1 && (
            <span className="text-neutral-500 text-lg font-bold mx-1 self-center">-</span>
          )}
        </div>
      ))}
    </div>
  )
}
