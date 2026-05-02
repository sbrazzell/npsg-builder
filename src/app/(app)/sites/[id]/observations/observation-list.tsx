'use client'

import { reorderObservations } from '@/actions/observations'
import { SortableList } from '@/components/shared/sortable-list'
import { ObservationCard } from './observation-card'
import type { SiblingSite } from '@/components/shared/move-to-site-button'

type Observation = {
  id: string
  siteId: string
  title: string
  locationDescription: string | null
  observationType: string | null
  severity: number
  notes: string | null
  includedInFiling: boolean
  sortOrder: number
}

export function ObservationList({
  observations,
  siteId,
  siblingSites = [],
}: {
  observations: Observation[]
  siteId: string
  siblingSites?: SiblingSite[]
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
          {observations.filter(o => o.includedInFiling).length}/{observations.length} included in filing · drag to reorder
        </p>
      </div>
      <SortableList
        items={observations}
        siteId={siteId}
        onReorder={reorderObservations}
        renderItem={(obs, dragHandleProps) => (
          <ObservationCard obs={obs} siteId={siteId} dragHandleProps={dragHandleProps} siblingSites={siblingSites} />
        )}
      />
    </div>
  )
}
