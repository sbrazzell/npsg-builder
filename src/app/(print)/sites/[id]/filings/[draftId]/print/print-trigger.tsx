'use client'

import { useEffect, useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import type { DocumentStatus } from '@/lib/export-validation'

function formatPrintTime(d: Date) {
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

const STATUS_CHIP: Record<DocumentStatus, { bg: string; text: string }> = {
  incomplete:       { bg: '#fee2e2', text: '#991b1b' },
  'review-ready':   { bg: '#fef3c7', text: '#92400e' },
  'submission-ready': { bg: '#dcfce7', text: '#166534' },
}

export function PrintTrigger({
  title,
  capturedDate,
  statusLabel,
  status,
}: {
  title: string
  capturedDate: string
  statusLabel: string
  status: DocumentStatus
}) {
  const [printTime, setPrintTime] = useState('')
  const printTimeRef = useRef('')

  useEffect(() => {
    const initial = formatPrintTime(new Date())
    setPrintTime(initial)
    printTimeRef.current = initial

    function onBeforePrint() {
      const now = formatPrintTime(new Date())
      printTimeRef.current = now
      setPrintTime(now)
    }

    window.addEventListener('beforeprint', onBeforePrint)
    const t = setTimeout(() => window.print(), 600)

    return () => {
      clearTimeout(t)
      window.removeEventListener('beforeprint', onBeforePrint)
    }
  }, [])

  const chip = STATUS_CHIP[status]

  return (
    <>
      {/* ── Screen-only toolbar ── */}
      <div className="no-print-ui sticky top-0 z-50 flex items-center justify-between gap-4 px-8 py-3 border-b bg-white shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <p className="font-semibold text-[14px] text-slate-800">{title}</p>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded"
              style={{ background: chip.bg, color: chip.text }}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">Snapshot: {capturedDate}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded text-[13px] font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>

      {/* ── Print-only header (position:fixed → repeats on every page) ── */}
      <div className="print-page-header" aria-hidden="true">
        <span className="print-audit-title">NSGP Builder · {title} · {statusLabel}</span>
        <span className="print-audit-time">Printed: {printTime}</span>
      </div>

      {/* ── Print-only footer ── */}
      <div className="print-page-footer" aria-hidden="true">
        <span>Pre-Submission Draft — For internal planning use only</span>
        <span>{title} · {printTime}</span>
      </div>
    </>
  )
}
