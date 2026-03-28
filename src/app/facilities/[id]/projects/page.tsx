import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency } from '@/lib/scoring'
import { FileText, Plus, DollarSign, ChevronRight, Link2 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-green-100 text-green-700',
}

export default async function ProjectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      organization: true,
      projectProposals: {
        include: {
          budgetItems: true,
          threatLinks: { include: { threat: true } },
        },
        orderBy: { priority: 'asc' },
      },
    },
  })

  if (!facility) notFound()

  let totalBudget = 0
  for (const p of facility.projectProposals) {
    for (const b of p.budgetItems) { totalBudget += b.totalCost }
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/facilities' },
        { label: facility.facilityName, href: `/facilities/${id}` },
        { label: 'Project Proposals' },
      ]} />
      <div className="p-8">
        <PageHeader
          title="Project Proposals"
          description={`Security improvement projects for ${facility.facilityName}`}
          action={
            <Button asChild>
              <Link href={`/facilities/${id}/projects/new`}>
                <Plus className="h-4 w-4 mr-2" /> Add Project
              </Link>
            </Button>
          }
        />

        {facility.projectProposals.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{facility.projectProposals.length}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalBudget)}</p>
                <p className="text-xs text-muted-foreground">Total Budget Requested</p>
              </CardContent>
            </Card>
          </div>
        )}

        {facility.projectProposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No project proposals yet"
            description="Create project proposals to describe the security improvements you are requesting funding for."
            actionLabel="Add First Project"
            actionHref={`/facilities/${id}/projects/new`}
          />
        ) : (
          <div className="space-y-3">
            {facility.projectProposals.map((project) => {
              const budget = project.budgetItems.reduce<number>((s, b) => s + b.totalCost, 0)
              return (
                <Link key={project.id} href={`/facilities/${id}/projects/${project.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-sm font-bold flex-shrink-0">
                        {project.priority}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{project.title}</p>
                          {project.category && (
                            <Badge variant="outline" className="text-xs">{project.category}</Badge>
                          )}
                        </div>
                        {project.problemStatement && (
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">{project.problemStatement}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {project.threatLinks.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Link2 className="h-3 w-3" />
                            {project.threatLinks.length}
                          </span>
                        )}
                        {budget > 0 && (
                          <span className="flex items-center gap-1 text-sm font-medium text-emerald-700">
                            <DollarSign className="h-3.5 w-3.5" />
                            {formatCurrency(budget)}
                          </span>
                        )}
                        <Badge className={`text-xs ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`} variant="outline">
                          {project.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
