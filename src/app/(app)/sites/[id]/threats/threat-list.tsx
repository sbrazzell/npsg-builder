'use client'

import Link from 'next/link'
import { reorderThreats } from '@/actions/threats'
import { SortableList } from '@/components/shared/sortable-list'
import { ThreatCard, type Threat } from './threat-card'
import { Plus } from 'lucide-react'
import type { SiblingSite } from '@/components/shared/move-to-site-button'

export function ThreatList({ threats, siteId, siblingSites = [] }: { threats: Threat[]; siteId: string; siblingSites?: SiblingSite[] }) {
  return (
    <div className="rounded-sm border overflow-hidden ml-1" style={{ borderColor: 'var(--rule)' }}>
      {/* Header */}
      <div
        className="px-4 py-3.5 border-b flex items-center justify-between"
        style={{ background: 'var(--paper-2)', borderColor: 'var(--rule)' }}
      >
        <p className="font-serif font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>
          Threats
        </p>
        <span
          className="text-[11px] tabular-nums"
          style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}
        >
          {threats.filter(t => t.includedInFiling).length}/{threats.length} included · drag to reorder
        </span>
      </div>

      {/* Sortable list */}
      <SortableList
        items={threats}
        siteId={siteId}
        onReorder={reorderThreats}
        renderItem={(t, dragHandleProps, _isDragging, index) => (
          <ThreatCard
            threat={t}
            siteId={siteId}
            index={index + 1}
            dragHandleProps={dragHandleProps}
            siblingSites={siblingSites}
          />
        )}
      />

      {/* Footer — add link */}
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
