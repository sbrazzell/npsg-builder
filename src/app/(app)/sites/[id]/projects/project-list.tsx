'use client'

import Link from 'next/link'
import { toggleProjectIncluded, reorderProjects } from '@/actions/projects'
import { SortableList, DragHandle } from '@/components/shared/sortable-list'
import { FilingToggle } from '@/components/shared/filing-toggle'
import { formatCurrency } from '@/lib/scoring'
import { ChevronRight, Link2, DollarSign } from 'lucide-react'

type Project = {
  id: string
  title: string
  category: string | null
  problemStatement: string | null
  status: string
  priority: number
  budget: number
  threatLinkCount: number
  includedInFiling: boolean
  sortOrder: number
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: 'var(--paper-2)', text: 'var(--ink-3)' },
  review:    { bg: '#fffbeb', text: '#92400e' },
  submitted: { bg: '#f0fdf4', text: '#166534' },
}

export function ProjectList({ projects, siteId }: { projects: Project[]; siteId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
          {projects.filter(p => p.includedInFiling).length}/{projects.length} included in filing · drag to reorder
        </p>
      </div>

      <div className="space-y-2">
        <SortableList
          items={projects}
          siteId={siteId}
          onReorder={reorderProjects}
          renderItem={(project, dragHandleProps) => {
            const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.draft
            return (
              <div
                className="rounded-sm border flex items-stretch overflow-hidden"
                style={{
                  borderColor: 'var(--rule)',
                  background: project.includedInFiling ? 'white' : 'var(--paper-2)',
                  opacity: project.includedInFiling ? 1 : 0.65,
                }}
              >
                {/* Drag handle column */}
                <div className="flex items-center px-2 border-r" style={{ borderColor: 'var(--rule-2)', background: 'var(--paper-2)' }}>
                  <DragHandle {...dragHandleProps} />
                </div>

                {/* Main content — still linkable */}
                <Link href={`/sites/${siteId}/projects/${project.id}`} className="flex-1 min-w-0 flex items-center gap-4 px-4 py-3.5 group">
                  {/* Priority badge */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-serif font-semibold text-white shrink-0"
                    style={{ background: 'var(--nav-accent)', fontSize: '13px' }}
                  >
                    {project.priority}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>
                        {project.title}
                      </p>
                      {project.category && (
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded-sm border"
                          style={{ borderColor: 'var(--rule)', color: 'var(--ink-3)' }}
                        >
                          {project.category}
                        </span>
                      )}
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded-sm"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        {project.status}
                      </span>
                    </div>
                    {project.problemStatement && (
                      <p className="text-[12.5px] mt-0.5 truncate" style={{ color: 'var(--ink-3)' }}>
                        {project.problemStatement}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {project.threatLinkCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                        <Link2 className="h-3 w-3" />
                        {project.threatLinkCount}
                      </span>
                    )}
                    {project.budget > 0 && (
                      <span className="flex items-center gap-0.5 text-[13px] font-medium" style={{ color: 'var(--ok)' }}>
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(project.budget)}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4" style={{ color: 'var(--ink-4)' }} />
                  </div>
                </Link>

                {/* Filing toggle — outside the link */}
                <div className="flex items-center px-3 border-l" style={{ borderColor: 'var(--rule-2)' }}>
                  <FilingToggle
                    id={project.id}
                    siteId={siteId}
                    includedInFiling={project.includedInFiling}
                    onToggle={toggleProjectIncluded}
                  />
                </div>
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
