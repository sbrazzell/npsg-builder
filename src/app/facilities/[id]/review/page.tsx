import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { calculateRiskScore, getRiskLevel } from '@/lib/scoring'
import { AlertTriangle, CheckCircle, XCircle, Download, Info } from 'lucide-react'

interface SectionScore {
  label: string
  score: number
  max: number
  notes: string[]
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      organization: true,
      threatAssessments: {
        include: { projectLinks: true },
      },
      securityMeasures: true,
      projectProposals: {
        include: {
          budgetItems: true,
          threatLinks: true,
        },
      },
      siteObservations: true,
      narrativeDrafts: {
        orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }],
      },
    },
  })

  if (!facility) notFound()

  // Get latest narratives per section
  const narrativeSections = new Set<string>()
  for (const draft of facility.narrativeDrafts) {
    narrativeSections.add(draft.sectionName)
  }

  const warnings: string[] = []
  const checks: string[] = []

  // -- Organization completeness --
  const org = facility.organization
  let orgScore = 0
  if (org.name) orgScore++
  if (org.einOrTaxId) { orgScore++; checks.push('EIN/Tax ID on file') } else warnings.push('Organization is missing EIN/Tax ID — required for grant applications')
  if (org.contactEmail) orgScore++
  if (org.address) orgScore++

  // -- Facility completeness --
  let facScore = 0
  if (facility.populationServed) { facScore++; checks.push('Population served documented') } else warnings.push('Population served is not documented — essential for demonstrating need')
  if (facility.knownSecurityConcerns) { facScore++; checks.push('Known security concerns documented') } else warnings.push('Known security concerns field is empty')
  if (facility.daysHoursOfOperation) facScore++
  if (facility.surroundingAreaNotes) { facScore++; checks.push('Surrounding area context documented') } else warnings.push('Surrounding area context is missing — helps establish threat environment')

  // -- Threat Assessment completeness --
  let threatScore = 0
  const threats = facility.threatAssessments
  if (threats.length > 0) { threatScore++; checks.push(`${threats.length} threat(s) documented`) } else warnings.push('No threats documented — threat assessment is the foundation of the grant narrative')
  const highRisk = threats.filter((t) => getRiskLevel(calculateRiskScore(t.likelihood, t.impact)) === 'high' || getRiskLevel(calculateRiskScore(t.likelihood, t.impact)) === 'critical')
  if (highRisk.length > 0) { threatScore++; checks.push(`${highRisk.length} high/critical threats identified`) }
  const threatsWithHistory = threats.filter((t) => t.incidentHistory && t.incidentHistory.trim().length > 0)
  if (threatsWithHistory.length > 0) { threatScore++; checks.push('Incident history documented on threats') } else if (threats.length > 0) warnings.push('No incident history documented on any threats — prior incidents strengthen applications')
  const threatsWithVulnNotes = threats.filter((t) => t.vulnerabilityNotes && t.vulnerabilityNotes.trim().length > 0)
  if (threatsWithVulnNotes.length > 0) threatScore++
  const maxThreatScore = 4

  // -- Security Measures --
  let measScore = 0
  const measures = facility.securityMeasures
  if (measures.length > 0) { measScore++; checks.push(`${measures.length} existing security measure(s) documented`) } else warnings.push('No existing security measures documented — baseline analysis is incomplete')
  const lowMeasures = measures.filter((m) => m.effectivenessRating <= 2)
  if (lowMeasures.length > 0) { measScore++; checks.push(`${lowMeasures.length} measure(s) rated low effectiveness — supports improvement justification`) }
  const measWithGaps = measures.filter((m) => m.gapsRemaining && m.gapsRemaining.trim().length > 0)
  if (measWithGaps.length > 0) { measScore++; checks.push('Security gaps documented') } else if (measures.length > 0) warnings.push('Gaps remaining not documented on security measures')
  const maxMeasScore = 3

  // -- Projects --
  let projScore = 0
  const projects = facility.projectProposals
  if (projects.length > 0) { projScore++; checks.push(`${projects.length} project proposal(s) created`) } else warnings.push('No project proposals created — proposals are the core of the grant request')
  const projWithBudget = projects.filter((p) => p.budgetItems.length > 0)
  if (projWithBudget.length === projects.length && projects.length > 0) { projScore++; checks.push('All projects have budget items') } else if (projects.length > 0) warnings.push('Some projects are missing budget items')
  const projWithThreats = projects.filter((p) => p.threatLinks.length > 0)
  if (projWithThreats.length > 0) { projScore++; checks.push(`${projWithThreats.length} project(s) linked to threats`) } else if (projects.length > 0) warnings.push('No projects are linked to threat assessments — threat-project alignment is critical for grant scoring')
  const projWithJustification = projects.filter((p) => p.problemStatement && p.riskReductionRationale)
  if (projWithJustification.length === projects.length && projects.length > 0) { projScore++; checks.push('All projects have problem statements and risk reduction rationale') } else if (projects.length > 0) warnings.push('Some projects are missing problem statement or risk reduction rationale')
  const maxProjScore = 4

  const budgetItems = projects.flatMap((p) => p.budgetItems)
  const budgetWithJustification = budgetItems.filter((b) => b.justification && b.justification.trim().length > 0)
  if (budgetItems.length > 0 && budgetWithJustification.length < budgetItems.length) {
    warnings.push(`${budgetItems.length - budgetWithJustification.length} budget item(s) missing justification text`)
  }

  // -- Narratives --
  let narScore = 0
  const expectedSections = ['executive_summary', 'threat_overview', 'vulnerability_statement', 'project_justification']
  for (const s of expectedSections) {
    if (narrativeSections.has(s)) narScore++
    else warnings.push(`Narrative section "${s.replace(/_/g, ' ')}" has not been generated`)
  }
  const maxNarScore = 4

  const sections: SectionScore[] = [
    { label: 'Organization Profile', score: orgScore, max: 4, notes: [] },
    { label: 'Facility Profile', score: facScore, max: 4, notes: [] },
    { label: 'Threat Assessment', score: threatScore, max: maxThreatScore, notes: [] },
    { label: 'Security Measures', score: measScore, max: maxMeasScore, notes: [] },
    { label: 'Project Proposals', score: projScore, max: maxProjScore, notes: [] },
    { label: 'Narratives', score: narScore, max: maxNarScore, notes: [] },
  ]

  const totalScore = sections.reduce((s, sec) => s + sec.score, 0)
  const totalMax = sections.reduce((s, sec) => s + sec.max, 0)
  const overallPct = Math.round((totalScore / totalMax) * 100)

  const overallLevel = overallPct >= 85 ? 'Strong' : overallPct >= 65 ? 'Good' : overallPct >= 45 ? 'Developing' : 'Incomplete'
  const overallColor = overallPct >= 85 ? 'text-green-700' : overallPct >= 65 ? 'text-blue-700' : overallPct >= 45 ? 'text-yellow-700' : 'text-red-700'

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/facilities' },
        { label: facility.facilityName, href: `/facilities/${id}` },
        { label: 'Review & Scorecard' },
      ]} />
      <div className="p-8">
        <PageHeader
          title="Review & Scorecard"
          description={`Application readiness assessment for ${facility.facilityName}`}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/facilities/${id}/export`}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Link>
            </Button>
          }
        />

        {/* Overall Score */}
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Overall Readiness</p>
                <p className={`text-3xl font-bold ${overallColor}`}>{overallPct}%</p>
                <p className={`text-sm font-medium ${overallColor}`}>{overallLevel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{totalScore}<span className="text-muted-foreground text-base">/{totalMax}</span></p>
              </div>
            </div>
            <Progress value={overallPct} className="h-3" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Section Completeness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.map((sec) => {
                const pct = Math.round((sec.score / sec.max) * 100)
                return (
                  <div key={sec.label}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{sec.label}</p>
                      <p className="text-xs text-muted-foreground">{sec.score}/{sec.max}</p>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Warnings & Checks */}
          <div className="space-y-4">
            {warnings.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Issues to Address ({warnings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                        <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {checks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Completed Items ({checks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {checks.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {overallPct >= 75 && (
          <Alert className="mt-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-700" />
            <AlertDescription className="text-green-800">
              This application is in good shape. Review any remaining warnings, then proceed to <Link href={`/facilities/${id}/export`} className="font-medium underline">Export</Link> to download your draft application packet.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
