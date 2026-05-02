import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency } from '@/lib/scoring'
import { FileText, Plus } from 'lucide-react'
import { ProjectList } from './project-list'
import { ProjectGenerator } from './project-generator'
import { BudgetStrategyPanel } from './budget-strategy'

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
        orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }],
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
    includedInFiling: p.includedInFiling ?? true,
    sortOrder: p.sortOrder ?? 0,
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
          <div className="flex items-center gap-2 mt-0.5">
            <ProjectGenerator siteId={id} hasExistingProjects={projects.length > 0} />
            <Link
              href={`/sites/${id}/projects/new`}
              className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-sm text-[13px] font-medium"
              style={{ background: 'var(--nav-accent)', color: '#fff', border: '1px solid var(--nav-accent)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Project
            </Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="space-y-6">
            <ProjectGenerator siteId={id} hasExistingProjects={false} />
            <EmptyState
              icon={FileText}
              title="No project proposals yet"
              description="Generate AI-powered proposals based on your documented threats, or add a project manually."
              actionLabel="Add First Project"
              actionHref={`/sites/${id}/projects/new`}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <BudgetStrategyPanel projects={projects} />
            <ProjectList projects={projects} siteId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
