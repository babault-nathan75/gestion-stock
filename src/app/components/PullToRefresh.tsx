"use client"

import { useState, useRef, useCallback } from "react"
import { RefreshCw } from "lucide-react"

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const THRESHOLD = 80

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return
    const el = containerRef.current
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setPulling(true)
    }
  }, [refreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 120))
    }
  }, [pulling, refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true)
      setPullDistance(50)
      try {
        await onRefresh()
      } catch {}
      setRefreshing(false)
    }
    setPullDistance(0)
    setPulling(false)
  }, [pulling, pullDistance, onRefresh])

  return (
    <div
      ref={containerRef}
      className="relative min-h-[50vh] overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: `${pullDistance}px` }}
        >
          <RefreshCw
            className={`h-5 w-5 text-primary ${refreshing || pullDistance >= THRESHOLD ? "animate-spin" : ""}`}
            style={{
              transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)`,
            }}
          />
        </div>
      )}
      <div style={{ marginTop: refreshing ? 0 : undefined }}>
        {children}
      </div>
    </div>
  )
}
