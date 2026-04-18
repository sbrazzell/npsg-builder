import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { RiskBadge } from '@/components/shared/risk-badge'
import { formatCurrency } from '@/lib/scoring'
import { DollarSign, Link2, Plus, Edit, ChevronRight } from 'lucide-react'
import { ProjectActions } from './project-actions'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>
}) {
  const { id, projectId } = await params
  const project = await prisma.projectProposal.findUnique({
    where: { id: projectId },
    include: {
      budgetItems: { orderBy: { createdAt: 'asc' } },
      threatLinks: { include: { threat: true } },
      site: {
        include: {
          organization: true,
          threatAssessments: true,
        },
      },
    },
  })

  if (!project || project.siteId !== id) notFound()

  const totalBudget = project.budgetItems.reduce((s: number, b) => s + b.totalCost, 0)
  const linkedThreatIds = new Set(project.threatLinks.map((l) => l.threatId))
  const unlinkedThreats = project.site.threatAssessments.filter((t) => !linkedThreatIds.has(t.id))

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/sites' },
        { label: project.site.siteName, href: `/sites/${id}` },
        { label: 'Projects', href: `/sites/${id}/projects` },
        { label: project.title },
      ]} />
      <div className="p-4 md:p-8">
        <PageHeader
          title={project.title}
          description={project.category || undefined}
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/sites/${id}/projects/${projectId}/budget`}>
                  <DollarSign className="h-4 w-4 mr-1" /> Budget
                </Link>
              </Button>
              <ProjectActions project={project} siteId={id} />
            </div>
          }
        />

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{project.priority}<span className="text-sm text-muted-foreground">/5</span></p>
              <p className="text-xs text-muted-foreground">Priority</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalBudget)}</p>
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <Badge
                variant="outline"
                className={`text-sm ${project.status === 'submitted' ? 'text-green-700 border-green-200 bg-green-50' : ''}`}
              >
                {project.status}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Status</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Problem & Solution */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Justification</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Problem Statement</p>
                <p className="text-gray-700">{project.problemStatement || <span className="italic text-muted-foreground">Not yet written</span>}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Proposed Solution</p>
                <p className="text-gray-700">{project.proposedSolution || <span className="italic text-muted-foreground">Not yet written</span>}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Risk Reduction Rationale</p>
                <p className="text-gray-700">{project.riskReductionRationale || <span className="italic text-muted-foreground">Not yet written</span>}</p>
              </div>
            </CardContent>
          </Card>

          {/* Linked Threats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Linked Threats ({project.threatLinks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.threatLinks.length === 0 && unlinkedThreats.length === 0 && (
                <p className="text-sm text-muted-foreground">No threats to link. Add threats first.</p>
              )}
              {project.threatLinks.length === 0 && unlinkedThreats.length > 0 && (
                <p className="text-sm text-muted-foreground mb-3">No linked threats yet. Link threats below to establish risk alignment.</p>
              )}
              <div className="space-y-2">
                {project.threatLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-sm truncate">{link.threat.threatType}</span>
                    </div>
                    <RiskBadge likelihood={link.threat.likelihood} impact={link.threat.impact} showScore={false} />
                  </div>
                ))}
              </div>
              {unlinkedThreats.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Available threats to link:</p>
                  <ThreatLinkButtons
                    projectId={projectId}
                    siteId={id}
                    unlinkedThreats={unlinkedThreats}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Budget ({project.budgetItems.length} items)</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/sites/${id}/projects/${projectId}/budget`}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Manage
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {project.budgetItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No budget items yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {project.budgetItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{item.itemName}</span>
                      <span className="font-medium ml-2 flex-shrink-0">{formatCurrency(item.totalCost)}</span>
                    </div>
                  ))}
                  {project.budgetItems.length > 5 && (
                    <p className="text-xs text-muted-foreground">+{project.budgetItems.length - 5} more items</p>
                  )}
                  <div className="pt-2 border-t flex items-center justify-between font-semibold text-sm">
                    <span>Total</span>
                    <span className="text-emerald-700">{formatCurrency(totalBudget)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Implementation Notes */}
          {project.implementationNotes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Implementation Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{project.implementationNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// Client component for threat linking
import { ThreatLinkButtons } from './threat-link-buttons'
