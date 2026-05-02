'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteMeasure, toggleMeasureIncluded, reorderMeasures } from '@/actions/measures'
import { SortableList, DragHandle } from '@/components/shared/sortable-list'
import { FilingToggle } from '@/components/shared/filing-toggle'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

type Measure = {
  id: string
  category: string
  description: string | null
  effectivenessRating: number
  gapsRemaining: string | null
  notes: string | null
  includedInFiling: boolean
  sortOrder: number
}

const EFFECTIVENESS_LABEL: Record<number, string> = {
  1: 'Ineffective',
  2: 'Poor',
  3: 'Adequate',
  4: 'Good',
  5: 'Excellent',
}

const EFFECTIVENESS_COLOR: Record<number, string> = {
  1: 'var(--risk-critical)',
  2: 'var(--risk-high)',
  3: 'var(--risk-med)',
  4: 'var(--ok)',
  5: 'var(--ok)',
}

export function MeasureList({ measures, siteId }: { measures: Measure[]; siteId: string }) {
  const router = useRouter()

  async function handleDelete(id: string) {
    if (!confirm('Delete this security measure?')) return
    const result = await deleteMeasure(id, siteId)
    if (result.success) {
      toast.success('Measure deleted')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-0 rounded-sm border overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
      <div className="px-4 py-3.5 border-b flex items-center justify-between"
        style={{ background: 'var(--paper-2)', borderColor: 'var(--rule)' }}>
        <p className="font-serif font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>
          Security Measures
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] tabular-nums" style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}>
            {measures.filter(m => m.includedInFiling).length}/{measures.length} included
          </span>
          <Link
            href={`/sites/${siteId}/measures/new`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[12px] font-medium"
            style={{ background: 'var(--nav-accent)', color: '#fff' }}
          >
            <Plus className="h-3 w-3" />
            Add
          </Link>
        </div>
      </div>

      <SortableList
        items={measures}
        siteId={siteId}
        onReorder={reorderMeasures}
        renderItem={(m, dragHandleProps) => (
          <div
            className="px-4 py-3 border-b flex gap-3 items-start"
            style={{
              borderColor: 'var(--rule-2)',
              background: m.includedInFiling ? 'white' : 'var(--paper-2)',
              opacity: m.includedInFiling ? 1 : 0.65,
            }}
          >
            <DragHandle {...dragHandleProps} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-sm"
                  style={{ background: 'var(--nav-wash)', color: 'var(--nav-accent)' }}
                >
                  {m.category}
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: EFFECTIVENESS_COLOR[m.effectivenessRating] ?? 'var(--ink-3)' }}
                >
                  {m.effectivenessRating}/5 — {EFFECTIVENESS_LABEL[m.effectivenessRating] ?? 'Unknown'}
                </span>
              </div>

              {m.description && (
                <p className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{m.description}</p>
              )}
              {m.gapsRemaining && (
                <p className="text-[12px] mt-1" style={{ color: 'var(--risk-high)' }}>
                  <span className="font-medium">Gaps: </span>{m.gapsRemaining}
                </p>
              )}
              {m.notes && (
                <p className="text-[11.5px] mt-1" style={{ color: 'var(--ink-3)' }}>{m.notes}</p>
              )}

              <div className="mt-2">
                <FilingToggle
                  id={m.id}
                  siteId={siteId}
                  includedInFiling={m.includedInFiling}
                  onToggle={toggleMeasureIncluded}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDelete(m.id)}
              className="shrink-0 flex items-center justify-center h-7 w-7 rounded-sm mt-0.5"
              style={{ color: 'var(--ink-4)' }}
              title="Delete measure"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      />

      {measures.length === 0 && (
        <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--ink-3)' }}>
          No security measures documented yet.
        </div>
      )}
    </div>
  )
}
