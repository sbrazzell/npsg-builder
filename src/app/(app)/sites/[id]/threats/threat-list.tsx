'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteThreat, toggleThreatIncluded, reorderThreats } from '@/actions/threats'
import { calculateRiskScore, getRiskLevel } from '@/lib/scoring'
import { SortableList, DragHandle } from '@/components/shared/sortable-list'
import { FilingToggle } from '@/components/shared/filing-toggle'
import { THREAT_SOURCES } from '@/lib/validations'
import { Plus, Pencil, Trash2, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'

const DOT_COLORS: Record<string, string> = {
  crit: 'var(--risk-critical)',
  high: 'var(--risk-high)',
  med:  'var(--risk-med)',
  low:  'var(--risk-low)',
  min:  'var(--ink-4)',
}

function dotClass(level: string): string {
  switch (level) {
    case 'critical': return 'crit'
    case 'high':     return 'high'
    case 'medium':   return 'med'
    case 'low':      return 'low'
    default:         return 'min'
  }
}

type Threat = {
  id: string
  threatType: string
  description: string | null
  likelihood: number
  impact: number
  source: string
  sourceAgency: string | null
  includedInFiling: boolean
  sortOrder: number
}

export function ThreatList({ threats, siteId }: { threats: Threat[]; siteId: string }) {
  const router = useRouter()

  async function handleDelete(threatId: string) {
    if (!confirm('Delete this threat assessment? This cannot be undone.')) return
    const result = await deleteThreat(threatId, siteId)
    if (result.success) {
      toast.success('Threat deleted')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete')
    }
  }

  return (
    <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
      <div className="px-4 py-3.5 border-b flex items-center justify-between"
        style={{ background: 'var(--paper-2)', borderColor: 'var(--rule)' }}>
        <p className="font-serif font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>
          Threats
        </p>
        <span className="text-[11px] tabular-nums" style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}>
          {threats.filter(t => t.includedInFiling).length}/{threats.length} included
        </span>
      </div>

      <SortableList
        items={threats}
        siteId={siteId}
        onReorder={reorderThreats}
        renderItem={(t, dragHandleProps, isDragging) => {
          const riskScore = calculateRiskScore(t.likelihood, t.impact)
          const riskLevel = getRiskLevel(riskScore)
          const level = dotClass(riskLevel)
          const source = THREAT_SOURCES.find(s => s.value === t.source)
          const idx = threats.indexOf(t) + 1

          return (
            <div
              className="px-3 py-3 border-b flex gap-2.5 items-start transition-colors"
              style={{
                borderColor: 'var(--rule-2)',
                background: t.includedInFiling ? undefined : 'var(--paper-2)',
                opacity: t.includedInFiling ? 1 : 0.6,
              }}
            >
              {/* Drag handle */}
              <DragHandle {...dragHandleProps} />

              {/* Number badge */}
              <div
                className="w-[24px] h-[24px] rounded-full flex items-center justify-center font-serif font-semibold text-white flex-shrink-0 mt-0.5"
                style={{ fontSize: '11.5px', background: DOT_COLORS[level] }}
              >
                {idx}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13px] truncate" style={{ color: 'var(--ink)' }}>
                  {t.threatType}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10.5px] tabular-nums" style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}>
                    L{t.likelihood}×I{t.impact} = {riskScore}
                  </span>
                  {t.source && t.source !== 'self_assessed' && (
                    <span className="text-[10.5px] flex items-center gap-0.5" style={{ color: 'var(--nav-accent)' }}>
                      {t.source === 'law_enforcement' && <BadgeCheck className="h-3 w-3" />}
                      {source?.label ?? t.source}
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-[11.5px] mt-0.5 line-clamp-2" style={{ color: 'var(--ink-3)' }}>
                    {t.description}
                  </p>
                )}

                {/* Filing toggle */}
                <div className="mt-2">
                  <FilingToggle
                    id={t.id}
                    siteId={siteId}
                    includedInFiling={t.includedInFiling}
                    onToggle={toggleThreatIncluded}
                  />
                </div>
              </div>

              {/* Edit / delete */}
              <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                <Link
                  href={`/sites/${siteId}/threats/${t.id}/edit`}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-sm transition-colors"
                  style={{ color: 'var(--ink-4)' }}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-sm transition-colors"
                  style={{ color: 'var(--ink-4)' }}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        }}
      />

      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--rule-2)' }}>
        <Link
          href={`/sites/${siteId}/threats/new`}
          className="flex items-center gap-1.5 text-[12.5px] font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--nav-accent)' }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add another threat
        </Link>
      </div>
    </div>
  )
}
