export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'
import {
  CheckCircle2, Circle, AlertCircle, ChevronRight,
  Building2, AlertTriangle, Shield, FileText,
  MessageSquare, BadgeCheck, DollarSign, BarChart3,
} from 'lucide-react'

// ─── helpers ───────────────────────────────────────────────────────────────

function Check({ done, label, detail, href }: {
  done: boolean; label: string; detail?: string; href?: string
}) {
  return (
    <div className={`flex items-start gap-3 py-2.5 ${!done ? 'opacity-90' : ''}`}>
      {done
        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
        : <Circle className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${done ? 'text-gray-700' : 'text-gray-500'}`}>{label}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
      {!done && href && (
        <Button asChild size="sm" variant="ghost" className="shrink-0 h-7 text-xs text-blue-600">
          <Link href={href}>Fix →</Link>
        </Button>
      )}
    </div>
  )
}

function SectionScore({ score, total }: { score: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((score / total) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{score}/{total}</span>
    </div>
  )
}

// ─── page ──────────────────────────────────────────────────────────────────

export default async function ReadinessPage() {
  const facilities = await prisma.facility.findMany({
    include: {
      organization: true,
      threatAssessments: true,
      securityMeasures: true,
      projectProposals: { include: { budgetItems: true, threatLinks: true } },
      narrativeDrafts: { orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }] },
      grantAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const NARRATIVE_SECTIONS = [
    'executive_summary',
    'threat_overview',
    'vulnerability_statement',
    'project_justification',
    'budget_rationale',
    'implementation_approach',
  ]

  const NARRATIVE_LABELS: Record<string, string> = {
    executive_summary: 'Executive Summary',
    threat_overview: 'Threat Overview',
    vulnerability_statement: 'Vulnerability Statement',
    project_justification: 'Project Justification',
    budget_rationale: 'Budget Rationale',
    implementation_approach: 'Implementation Approach',
  }

  // Facility-level readiness calculations
  const facilityReadiness = facilities.map((f) => {
    const highRiskThreats = f.threatAssessments.filter((t) => {
      const lvl = getRiskLevel(calculateRiskScore(t.likelihood, t.impact))
      return lvl === 'high' || lvl === 'critical'
    })

    // Get latest narrative per section
    const coveredSections = new Set<string>()
    for (const d of f.narrativeDrafts) {
      if (!coveredSections.has(d.sectionName)) {
        const text = d.editedText || d.generatedText || ''
        if (text.trim().length > 50) coveredSections.add(d.sectionName)
      }
    }

    const totalBudget = f.projectProposals.reduce(
      (s, p) => s + p.budgetItems.reduce((b, i) => b + i.totalCost, 0), 0
    )

    const projectsWithThreats = f.projectProposals.filter((p) => p.threatLinks.length > 0)
    const projectsWithBudget = f.projectProposals.filter(
      (p) => p.budgetItems.length > 0 && p.budgetItems.some((b) => b.totalCost > 0)
    )

    const latestAnalysis = f.grantAnalyses[0] ?? null

    // LE assessment
    const leAgency = (f as any).lawEnforcementAgency
    const leResponseDate = (f as any).lawEnforcementResponseDate
    const leContactDate = (f as any).lawEnforcementContactDate

    // Checklist items (true = done)
    const checks = {
      orgComplete: !!(f.organization.einOrTaxId && f.organization.contactEmail && f.organization.address),
      facilityComplete: !!(f.populationServed && f.daysHoursOfOperation && f.address),
      hasThreats: f.threatAssessments.length >= 2,
      hasHighRisk: highRiskThreats.length > 0,
      hasMeasures: f.securityMeasures.length >= 1,
      hasProjects: f.projectProposals.length >= 1,
      projectsLinked: f.projectProposals.length > 0 && projectsWithThreats.length === f.projectProposals.length,
      projectsBudgeted: f.projectProposals.length > 0 && projectsWithBudget.length === f.projectProposals.length,
      narrativesCovered: NARRATIVE_SECTIONS.every((s) => coveredSections.has(s)),
      leContacted: !!leAgency,
      leResponseReceived: !!leResponseDate,
      analysisRun: !!latestAnalysis,
      analysisStrong: latestAnalysis ? latestAnalysis.overallScore >= 70 : false,
    }

    const score = Object.values(checks).filter(Boolean).length
    const total = Object.keys(checks).length

    return {
      facility: f,
      checks,
      score,
      total,
      coveredSections,
      totalBudget,
      latestAnalysis,
      leAgency,
      leContactDate,
      leResponseDate,
      highRiskThreats,
    }
  })

  const overallReady = facilityReadiness.filter((r) => r.score / r.total >= 0.8).length

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Pre-Announcement Readiness' }]} />
      <div className="p-4 md:p-8 max-w-5xl">
        <PageHeader
          title="Pre-Announcement Readiness"
          description="Complete these steps now so you're ready to submit the moment FEMA announces the new NSGP funding opportunity."
        />

        {/* Status summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-2 border-blue-100">
            <CardContent className="pt-4 pb-3">
              <p className="text-3xl font-bold text-blue-700">{facilities.length}</p>
              <p className="text-xs text-muted-foreground">Facilities in Progress</p>
            </CardContent>
          </Card>
          <Card className={`border-2 ${overallReady > 0 ? 'border-emerald-100' : 'border-slate-100'}`}>
            <CardContent className="pt-4 pb-3">
              <p className={`text-3xl font-bold ${overallReady > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{overallReady}</p>
              <p className="text-xs text-muted-foreground">Facilities ≥ 80% Ready</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-3xl font-bold text-emerald-700">
                {formatCurrency(facilityReadiness.reduce((s, r) => s + r.totalBudget, 0))}
              </p>
              <p className="text-xs text-muted-foreground">Total Budget Built</p>
            </CardContent>
          </Card>
        </div>

        {/* Global to-do while waiting */}
        <Card className="mb-8 border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              While You Wait for the Announcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-amber-900">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
              <p className="flex items-start gap-2"><span className="mt-1 text-amber-500">•</span>Contact local Police or Sheriff for each facility threat assessment</p>
              <p className="flex items-start gap-2"><span className="mt-1 text-amber-500">•</span>Confirm 501(c)(3) status letter and EIN are readily available</p>
              <p className="flex items-start gap-2"><span className="mt-1 text-amber-500">•</span>Gather quotes / vendor info for all proposed security equipment</p>
              <p className="flex items-start gap-2"><span className="mt-1 text-amber-500">•</span>Collect incident reports, police reports, or letters documenting prior threats</p>
              <p className="flex items-start gap-2"><span className="mt-1 text-amber-500">•</span>Identify an authorized organization representative for signatures</p>
              <p className="flex items-start gap-2"><span className="mt-1 text-amber-500">•</span>Confirm your State Administrative Agency (SAA) submission portal access</p>
              <p className="flex items-start gap-2"><span className="mt-1 text-amber-500">•</span>Review FEMA NSGP Notice of Funding Opportunity (NOFO) when released</p>
              <p className="flex items-start gap-2"><span className="mt-1 text-amber-500">•</span>Ensure each facility has a complete set of narrative drafts ready to finalize</p>
            </div>
          </CardContent>
        </Card>

        {/* Per-facility readiness */}
        {facilities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No facilities yet. Start by adding an organization and facility.</p>
              <Button asChild><Link href="/facilities/new">Add First Facility</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {facilityReadiness.map(({ facility: f, checks, score, total, coveredSections, totalBudget, latestAnalysis, leAgency, leContactDate, leResponseDate }) => {
              const pct = Math.round((score / total) * 100)
              const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'

              return (
                <Card key={f.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{f.facilityName}</CardTitle>
                          <span className="text-xs text-muted-foreground">{f.organization.name}</span>
                          <Badge
                            variant="outline"
                            className={pct >= 80 ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : pct >= 50 ? 'text-amber-700 border-amber-200 bg-amber-50' : 'text-red-700 border-red-200 bg-red-50'}
                          >
                            {pct}% ready
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">{score}/{total} checks</span>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="ghost" className="shrink-0">
                        <Link href={`/facilities/${f.id}`}>
                          Open <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 pt-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* Left column */}
                    <div className="pb-4 md:pb-0 md:pr-8 space-y-0.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Organization & Facility
                      </p>
                      <Check
                        done={checks.orgComplete}
                        label="Organization has EIN, contact email, and address"
                        href={`/organizations/${f.organizationId}/edit`}
                      />
                      <Check
                        done={checks.facilityComplete}
                        label="Facility has address, population served, and hours"
                        href={`/facilities/${f.id}/edit`}
                      />

                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Threat Assessment
                      </p>
                      <Check
                        done={checks.hasThreats}
                        label="At least 2 threats documented"
                        detail={`${f.threatAssessments.length} threat(s) on file`}
                        href={`/facilities/${f.id}/threats/new`}
                      />
                      <Check
                        done={checks.hasHighRisk}
                        label="At least one High or Critical risk threat"
                        href={`/facilities/${f.id}/threats`}
                      />
                      <Check
                        done={checks.hasMeasures}
                        label="Existing security measures documented"
                        detail={`${f.securityMeasures.length} measure(s) on file`}
                        href={`/facilities/${f.id}/measures/new`}
                      />

                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2 flex items-center gap-1.5">
                        <BadgeCheck className="h-3.5 w-3.5" /> Law Enforcement
                      </p>
                      <Check
                        done={checks.leContacted}
                        label={leAgency ? `Contacted: ${leAgency}` : 'Contacted local Police or Sheriff'}
                        detail={leContactDate ? `Requested: ${new Date(leContactDate).toLocaleDateString()}` : undefined}
                        href={`/facilities/${f.id}/edit`}
                      />
                      <Check
                        done={checks.leResponseReceived}
                        label="Law enforcement assessment received"
                        detail={leResponseDate ? `Received: ${new Date(leResponseDate).toLocaleDateString()}` : 'Log the date when their assessment arrives'}
                        href={`/facilities/${f.id}/edit`}
                      />
                    </div>

                    {/* Right column */}
                    <div className="pt-4 md:pt-0 md:pl-8 space-y-0.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Projects & Budget
                      </p>
                      <Check
                        done={checks.hasProjects}
                        label="At least one project proposal created"
                        detail={`${f.projectProposals.length} project(s)`}
                        href={`/facilities/${f.id}/projects/new`}
                      />
                      <Check
                        done={checks.projectsLinked}
                        label="All projects linked to at least one threat"
                        href={`/facilities/${f.id}/projects`}
                      />
                      <Check
                        done={checks.projectsBudgeted}
                        label="All projects have budget line items"
                        detail={totalBudget > 0 ? `Total: ${formatCurrency(totalBudget)}` : 'No budget entered yet'}
                        href={`/facilities/${f.id}/projects`}
                      />

                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" /> Narratives
                      </p>
                      {['executive_summary', 'threat_overview', 'vulnerability_statement', 'project_justification', 'budget_rationale', 'implementation_approach'].map((s) => (
                        <Check
                          key={s}
                          done={coveredSections.has(s)}
                          label={NARRATIVE_LABELS[s]}
                          href={`/facilities/${f.id}/narratives`}
                        />
                      ))}

                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2 flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5" /> Grant Strength
                      </p>
                      <Check
                        done={checks.analysisRun}
                        label="Grant strength analysis run"
                        detail={latestAnalysis ? `Score: ${latestAnalysis.overallScore}/100` : undefined}
                        href={`/analyzer/${f.id}`}
                      />
                      <Check
                        done={checks.analysisStrong}
                        label="Overall score ≥ 70/100"
                        detail={latestAnalysis ? `Current: ${latestAnalysis.overallScore}/100` : 'Run analysis first'}
                        href={`/analyzer/${f.id}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
