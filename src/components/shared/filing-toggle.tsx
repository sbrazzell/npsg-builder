'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

interface FilingToggleProps {
  id: string
  siteId: string
  includedInFiling: boolean
  onToggle: (id: string, included: boolean, siteId: string) => Promise<{ success: boolean; error?: string }>
  label?: string
}

export function FilingToggle({ id, siteId, includedInFiling, onToggle, label }: FilingToggleProps) {
  const [included, setIncluded] = useState(includedInFiling)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !included
    setIncluded(next) // optimistic
    startTransition(async () => {
      const result = await onToggle(id, next, siteId)
      if (!result.success) {
        setIncluded(!next) // revert
        toast.error(result.error || 'Failed to update')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={included ? 'Included in filing — click to exclude' : 'Excluded from filing — click to include'}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium transition-all select-none"
      style={{
        background: included ? 'var(--nav-wash)' : 'var(--paper-2)',
        color: included ? 'var(--nav-accent)' : 'var(--ink-4)',
        border: `1px solid ${included ? 'var(--nav-accent)' : 'var(--rule)'}`,
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {included ? (
        <Eye className="h-3 w-3 shrink-0" />
      ) : (
        <EyeOff className="h-3 w-3 shrink-0" />
      )}
      <span>{label ?? (included ? 'Included' : 'Excluded')}</span>
    </button>
  )
}
