'use client'

import { useState, useRef, useCallback } from 'react'

export function ThreatSplitLayout({
  matrix,
  list,
}: {
  matrix: React.ReactNode
  list: React.ReactNode
}) {
  const [splitPct, setSplitPct] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const raw = ((e.clientX - rect.left) / rect.width) * 100
    setSplitPct(Math.min(Math.max(raw, 25), 75))
  }, [])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  return (
    <div ref={containerRef} className="flex items-start">
      {/* Left panel — Risk Matrix */}
      <div style={{ width: `${splitPct}%`, flexShrink: 0, minWidth: 0 }}>
        {matrix}
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex-shrink-0 self-stretch cursor-col-resize select-none group"
        style={{ width: '20px' }}
        title={`Drag to resize · ${Math.round(splitPct)}%`}
      >
        {/* Full-height divider line */}
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors"
          style={{ background: 'var(--rule)' }}
        />
        {/* Grip indicator */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm flex flex-col items-center gap-[3px] py-2 px-1.5 transition-all opacity-50 group-hover:opacity-100"
          style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)' }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-full"
              style={{ width: '3px', height: '3px', background: 'var(--ink-3)' }}
            />
          ))}
        </div>
      </div>

      {/* Right panel — Threat list */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {list}
      </div>
    </div>
  )
}
