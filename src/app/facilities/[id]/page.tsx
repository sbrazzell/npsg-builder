import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { RiskBadge } from '@/components/shared/risk-badge'
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'
import {
  Edit, Plus, AlertTriangle, Shield, FileText, MessageSquare, Eye, Download,
  ClipboardCheck, MapPin, ChevronRight, DollarSign,
} from 'lucide-react'

export default async function FacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      organization: true,
      threatAssessments: { orderBy: { createdAt: 'desc' } },
      securityMeasures: { orderBy: { createdAt: 'desc' } },
      projectProposals: {
        include: { budgetItems: true },
        orderBy: { priority: 'asc' },
      },
      siteObservations: { orderBy: { createdAt: 'desc' }, take: 3 },
      narrativeDrafts: { orderBy: { updatedAt: 'desc' }, take: 5 },
    },
  })

  if (!facility) notFound()

  let totalBudget = 0
  for (const p of facility.projectProposals) {
    for (const b of p.budgetItems) { totalBudget += b.totalCost }
  }

  const highRiskCount = facility.threatAssessments.filter((t) => {
    const level = getRiskLevel(calculateRiskScore(t.likelihood, t.impact))
    return level === 'high' || level === 'critical'
  }).length

  const navItems = [
    { label: 'Threat Assessments', href: `/facilities/${id}/threats`, icon: AlertTriangle, count: facility.threatAssessments.length, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Security Measures', href: `/facilities/${id}/measures`, icon: Shield, count: facility.securityMeasures.length, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Projects', href: `/facilities/${id}/projects`, icon: FileText, count: facility.projectProposals.length, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Narratives', href: `/facilities/${id}/narratives`, icon: MessageSquare, count: facility.narrativeDrafts.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Site Observations', href: `/facilities/${id}/observations`, icon: Eye, count: facility.siteObservations.length, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Review & Scorecard', href: `/facilities/${id}/review`, icon: ClipboardCheck, count: null, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Export', href: `/facilities/${id}/export`, icon: Download, count: null, color: 'text-gray-600', bg: 'bg-gray-50' },
  ]

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/facilities' },
        { label: facility.organization.name, href: `/organizations/${facility.organizationId}` },
        { label: facility.facilityName },
      ]} />
      <div className="p-4 md:p-8">
        <PageHeader
          title={facility.facilityName}
          description={facility.organization.name + (facility.address ? ` · ${facility.address}` : '')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/facilities/${id}/edit`}>
                <Edit className="h-4 w-4 mr-1" /> Edit Details
              </Link>
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold text-red-600">{highRiskCount}</p>
              <p className="text-xs text-muted-foreground">High-Risk Threats</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{facility.threatAssessments.length}</p>
              <p className="text-xs text-muted-foreground">Total Threats</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{facility.projectProposals.length}</p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalBudget)}</p>
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.count !== null && (
                      <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Details & Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Facility Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Facility Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {facility.populationServed && (
                <div>
                  <p className="text-xs text-muted-foreground">Population Served</p>
                  <p>{facility.populationServed}</p>
                </div>
              )}
              {facility.daysHoursOfOperation && (
                <div>
                  <p className="text-xs text-muted-foreground">Hours of Operation</p>
                  <p>{facility.daysHoursOfOperation}</p>
                </div>
              )}
              {facility.knownSecurityConcerns && (
                <div>
                  <p className="text-xs text-muted-foreground">Known Security Concerns</p>
                  <p className="text-orange-700">{facility.knownSecurityConcerns}</p>
                </div>
              )}
              {facility.surroundingAreaNotes && (
                <div>
                  <p className="text-xs text-muted-foreground">Surrounding Area</p>
                  <p>{facility.surroundingAreaNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Threats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Top Threats</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/facilities/${id}/threats`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {facility.threatAssessments.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No threats documented yet.</p>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/facilities/${id}/threats/new`}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Threat
                    </Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {facility.threatAssessments
                    .sort((a, b) => calculateRiskScore(b.likelihood, b.impact) - calculateRiskScore(a.likelihood, a.impact))
                    .slice(0, 4)
                    .map((threat) => (
                      <li key={threat.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium truncate">{threat.threatType}</span>
                        <RiskBadge likelihood={threat.likelihood} impact={threat.impact} />
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          {facility.projectProposals.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Project Proposals</CardTitle>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/facilities/${id}/projects`}>View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {facility.projectProposals.map((project) => {
                    const budget = project.budgetItems.reduce((s: number, b) => s + b.totalCost, 0)
                    return (
                      <Link key={project.id} href={`/facilities/${id}/projects/${project.id}`}>
                        <div className="flex items-center gap-3 py-2 hover:bg-slate-50 rounded-md px-2 -mx-2 transition-colors">
                          <div className="p-1.5 bg-violet-50 rounded">
                            <FileText className="h-3.5 w-3.5 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{project.title}</p>
                            {project.category && <p className="text-xs text-muted-foreground">{project.category}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {budget > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(budget)}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-xs ${project.status === 'submitted' ? 'text-green-700 border-green-200 bg-green-50' : ''}`}
                            >
                              {project.status}
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
