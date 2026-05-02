'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRightLeft, X, Check } from 'lucide-react'

export type SiblingSite = { id: string; siteName: string }

interface Props {
  itemId: string
  sourceSiteId: string
  siblingSites: SiblingSite[]
  onMove: (itemId: string, targetSiteId: string, sourceSiteId: string) => Promise<{ success: boolean; error?: string }>
  label?: string
}

export function MoveToSiteButton({ itemId, sourceSiteId, siblingSites, onMove, label }: Props) {
  const [open, setOpen]       = useState(false)
  const [targetId, setTargetId] = useState(siblingSites[0]?.id ?? '')
  const [moving, setMoving]   = useState(false)
  const router = useRouter()

  if (siblingSites.length === 0) return null

  async function handleMove() {
    if (!targetId) return
    setMoving(true)
    const result = await onMove(itemId, targetId, sourceSiteId)
    if (result.success) {
      const dest = siblingSites.find((s) => s.id === targetId)?.siteName ?? 'other site'
      toast.success(`Moved to ${dest}`)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Move failed')
      setMoving(false)
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center h-7 w-7 rounded-sm transition-colors hover:bg-[var(--paper-2)]"
        style={{ color: 'var(--ink-4)' }}
        title={label ?? 'Move to another site'}
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border" style={{ borderColor: 'var(--rule)', background: 'var(--paper-2)' }}>
      <span className="text-[11px] font-medium shrink-0" style={{ color: 'var(--ink-3)' }}>Move to</span>
      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        disabled={moving}
        className="text-[11px] border rounded-sm px-1 py-0.5 max-w-[160px]"
        style={{ borderColor: 'var(--rule)', background: 'white', color: 'var(--ink)' }}
      >
        {siblingSites.map((s) => (
          <option key={s.id} value={s.id}>{s.siteName}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleMove}
        disabled={moving || !targetId}
        className="inline-flex items-center justify-center h-5 w-5 rounded-sm transition-colors disabled:opacity-50"
        style={{ background: 'var(--nav-accent)', color: '#fff' }}
        title="Confirm move"
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={moving}
        className="inline-flex items-center justify-center h-5 w-5 rounded-sm transition-colors hover:bg-[var(--rule)]"
        style={{ color: 'var(--ink-3)' }}
        title="Cancel"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
