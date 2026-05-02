import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency } from '@/lib/scoring'
import { FileText, Plus } from 'lucide-react'
import { ProjectList } from './project-list'

export default async function ProjectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.site.findUnique({
    where: { id },
    include: {
      organization: true,
      projectProposals: {
        include: {
          budgetItems: true,
          threatLinks: { include: { threat: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { priority: 'asc' }],
      },
    },
  })

  if (!facility) notFound()

  const projects = facility.projectProposals.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    problemStatement: p.problemStatement,
    status: p.status,
    priority: p.priority,
    budget: p.budgetItems.reduce((s, b) => s + b.totalCost, 0),
    threatLinkCount: p.threatLinks.length,
    includedInFiling: (p as any).includedInFiling ?? true,
    sortOrder: (p as any).sortOrder ?? 0,
  }))

  const included = projects.filter((p) => p.includedInFiling)
  const totalBudget = included.reduce((s, p) => s + p.budget, 0)
  const totalBudgetAll = projects.reduce((s, p) => s + p.budget, 0)

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Sites', href: '/sites' },
        { label: facility.siteName, href: `/sites/${id}` },
        { label: 'Project Proposals' },
      ]} />
      <div className="px-8 pb-16">

        {/* Page header */}
        <div className="pt-8 pb-6 flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Grant projects · {facility.siteName}</p>
            <h1 className="font-serif font-medium"
              style={{ fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Project Proposals
            </h1>
            <p className="mt-1.5 text-[13.5px]" style={{ color: 'var(--ink-3)' }}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} ·{' '}
              {included.length} included in filing ·{' '}
              {totalBudget > 0
                ? `${formatCurrency(totalBudget)} filing budget`
                : 'no budget yet'}
              {totalBudgetAll !== totalBudget && totalBudgetAll > 0
                ? ` (${formatCurrency(totalBudgetAll)} total across all)`
                : ''}
            </p>
          </div>
          <Link
            href={`/sites/${id}/projects/new`}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-sm text-[13px] font-medium mt-0.5"
            style={{ background: 'var(--nav-accent)', color: '#fff', border: '1px solid var(--nav-accent)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No project proposals yet"
            description="Create project proposals to describe the security improvements you are requesting funding for."
            actionLabel="Add First Project"
            actionHref={`/sites/${id}/projects/new`}
          />
        ) : (
          <ProjectList projects={projects} siteId={id} />
        )}
      </div>
    </div>
  )
}
