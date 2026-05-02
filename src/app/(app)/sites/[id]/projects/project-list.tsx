'use client'

import Link from 'next/link'
import { toggleProjectIncluded, reorderProjects } from '@/actions/projects'
import { SortableList, DragHandle } from '@/components/shared/sortable-list'
import { FilingToggle } from '@/components/shared/filing-toggle'
import { formatCurrency } from '@/lib/scoring'
import { ChevronRight, Link2, DollarSign, Shield } from 'lucide-react'

export type Project = {
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Access Control':    { bg: '#e9ecf5', text: '#1f2d5c', border: '#c5cde8' },
  'Surveillance':      { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  'Lighting':          { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  'Physical Hardening':{ bg: '#fef2f2', text: '#7f1d1d', border: '#fecaca' },
  'Communication':     { bg: '#f5f3ff', text: '#4c1d95', border: '#ddd6fe' },
}

function ProjectCard({
  project,
  siteId,
  dragHandleProps,
}: {
  project: Project
  siteId: string
  dragHandleProps: Parameters<typeof DragHandle>[0]
}) {
  const catStyle = project.category ? (CATEGORY_COLORS[project.category] ?? null) : null

  return (
    <div
      className="rounded-sm border flex items-stretch overflow-hidden"
      style={{
        borderColor: 'var(--rule)',
        background: project.includedInFiling ? 'white' : 'var(--paper-2)',
        opacity: project.includedInFiling ? 1 : 0.65,
      }}
    >
      {/* Drag handle */}
      <div className="flex items-center px-2 border-r" style={{ borderColor: 'var(--rule-2)', background: 'var(--paper-2)' }}>
        <DragHandle {...dragHandleProps} />
      </div>

      {/* Main content */}
      <Link href={`/sites/${siteId}/projects/${project.id}`} className="flex-1 min-w-0 flex items-center gap-4 px-4 py-3.5 group">
        {/* Priority badge */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-serif font-semibold text-white shrink-0"
          style={{ background: project.priority >= 4 ? 'var(--nav-accent)' : 'var(--ink-4)', fontSize: '13px' }}
        >
          {project.priority}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>
              {project.title}
            </p>
            {catStyle && project.category && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-sm border"
                style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}
              >
                {project.category}
              </span>
            )}
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
            <span className="flex items-center gap-0.5 text-[13px] font-medium" style={{ color: 'var(--ok)', fontFamily: 'var(--font-geist-mono)' }}>
              <DollarSign className="h-3.5 w-3.5" />
              {formatCurrency(project.budget)}
            </span>
          )}
          <ChevronRight className="h-4 w-4" style={{ color: 'var(--ink-4)' }} />
        </div>
      </Link>

      {/* Filing toggle */}
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
}

function GroupedList({ projects, siteId }: { projects: Project[]; siteId: string }) {
  if (projects.length === 0) return null
  return (
    <SortableList
      items={projects}
      siteId={siteId}
      onReorder={reorderProjects}
      renderItem={(project, dragHandleProps) => (
        <ProjectCard project={project} siteId={siteId} dragHandleProps={dragHandleProps} />
      )}
    />
  )
}

function SectionHeader({
  label,
  icon,
  count,
  budget,
  accent,
}: {
  label: string
  icon?: React.ReactNode
  count: number
  budget?: number
  accent: string
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <p className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
        {label}
      </p>
      <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
        {count} project{count !== 1 ? 's' : ''}
        {budget != null && budget > 0 ? ` · ${formatCurrency(budget)}` : ''}
      </span>
    </div>
  )
}

export function ProjectList({ projects, siteId }: { projects: Project[]; siteId: string }) {
  const selected = projects.filter((p) => p.status === 'selected')
  const consideration = projects.filter((p) => p.status === 'consideration')
  const other = projects.filter((p) => p.status !== 'selected' && p.status !== 'consideration')

  const selectedBudget = selected.filter((p) => p.includedInFiling).reduce((s, p) => s + p.budget, 0)

  const hasGroups = selected.length > 0 || consideration.length > 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
          {projects.filter((p) => p.includedInFiling).length}/{projects.length} included in filing · drag to reorder within groups
        </p>
      </div>

      {hasGroups ? (
        <>
          {selected.length > 0 && (
            <div>
              <SectionHeader
                label="Selected for Grant Inclusion"
                icon={<Shield className="h-3.5 w-3.5" style={{ color: 'var(--ok)' }} />}
                count={selected.length}
                budget={selectedBudget}
                accent="var(--ok)"
              />
              <GroupedList projects={selected} siteId={siteId} />
            </div>
          )}

          {consideration.length > 0 && (
            <div>
              <SectionHeader
                label="Consideration Phase"
                count={consideration.length}
                accent="var(--ink-3)"
              />
              <GroupedList projects={consideration} siteId={siteId} />
            </div>
          )}

          {other.length > 0 && (
            <div>
              <SectionHeader label="Other" count={other.length} accent="var(--ink-4)" />
              <GroupedList projects={other} siteId={siteId} />
            </div>
          )}
        </>
      ) : (
        <GroupedList projects={projects} siteId={siteId} />
      )}
    </div>
  )
}
