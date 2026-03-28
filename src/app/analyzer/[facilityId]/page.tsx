export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Info } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart2,
  Target,
  Shield,
  DollarSign,
  FileText,
  MapPin,
  ChevronRight,
} from 'lucide-react'
import { RunAnalysisButton } from './run-analysis-button'
import { ApplyRewriteButton } from './apply-rewrite-button'
import { generateNarrativeImprovements } from '@/lib/analyzer/recommendations'
import { ScoreHistoryChart } from './score-history-chart'
import { listAnalyses } from '@/actions/analysis'

interface PageProps {
  params: Promise<{ facilityId: string }>
}

function getScoreBadge(score: number): { label: string; className: string } {
  if (score >= 90) return { label: 'Excellent', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  if (score >= 80) return { label: 'Strong', className: 'bg-green-100 text-green-800 border-green-200' }
  if (score >= 60) return { label: 'Good', className: 'bg-blue-100 text-blue-800 border-blue-200' }
  if (score >= 40) return { label: 'Fair', className: 'bg-amber-100 text-amber-800 border-amber-200' }
  return { label: 'Needs Work', className: 'bg-red-100 text-red-800 border-red-200' }
}

function getSeverityBadge(severity: string): string {
  switch (severity) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200'
    case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'low': return 'bg-slate-100 text-slate-700 border-slate-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function getCategoryBadge(category: string): string {
  switch (category) {
    case 'threat': return 'bg-red-50 text-red-700 border-red-200'
    case 'vulnerability': return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'project': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'budget': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'narrative': return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'facility': return 'bg-blue-50 text-blue-700 border-blue-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

async function getFacilityWithAnalysis(facilityId: string) {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      organization: { select: { name: true } },
      grantAnalyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          flags: { orderBy: [{ severity: 'desc' }, { category: 'asc' }] },
          projectSnapshots: true,
        },
      },
    },
  })
  return facility
}

export default async function AnalyzerFacilityPage({ params }: PageProps) {
  const { facilityId } = await params

  const facility = await getFacilityWithAnalysis(facilityId)
  if (!facility) notFound()

  const analysis = facility.grantAnalyses[0] ?? null
  const analyzerProvider = process.env.ANALYZER_PROVIDER ?? 'rules'

  const historyResult = await listAnalyses(facilityId)
  const scoreHistory = historyResult.success && historyResult.data ? historyResult.data : []

  const dimensions = analysis
    ? [
        {
          label: 'Risk Clarity',
          score: analysis.riskClarityScore,
          icon: AlertTriangle,
          description: 'Quality of threat assessments with incident history and specificity',
          color: 'text-red-600',
          bg: 'bg-red-50',
        },
        {
          label: 'Vulnerability Specificity',
          score: analysis.vulnerabilitySpecificityScore,
          icon: MapPin,
          description: 'Completeness of facility vulnerability documentation',
          color: 'text-orange-600',
          bg: 'bg-orange-50',
        },
        {
          label: 'Project Alignment',
          score: analysis.projectAlignmentScore,
          icon: Target,
          description: 'How well projects are linked to documented threats',
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
        },
        {
          label: 'Budget Defensibility',
          score: analysis.budgetDefensibilityScore,
          icon: DollarSign,
          description: 'Specificity and justification of budget line items',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
        },
        {
          label: 'Narrative Quality',
          score: analysis.narrativeQualityScore,
          icon: FileText,
          description: 'Completeness and specificity of narrative drafts',
          color: 'text-violet-600',
          bg: 'bg-violet-50',
        },
      ]
    : []

  const badge = analysis ? getScoreBadge(analysis.overallScore) : null

  // Sort flags by severity: high first
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const sortedFlags = analysis
    ? [...analysis.flags].sort(
        (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
      )
    : []

  // Parse project snapshots
  const projectSnapshots = analysis
    ? analysis.projectSnapshots.map((snap) => {
        let parsed: {
          projectTitle?: string
          linkedThreatsCount?: number
          budgetItemCount?: number
          hasProblemStatement?: boolean
          hasRationale?: boolean
          hasImplementationNotes?: boolean
          budgetHasJustifications?: boolean
          findings?: string[]
        } = {}
        try {
          parsed = snap.findingsJson ? JSON.parse(snap.findingsJson) : {}
        } catch {
          // ignore parse errors
        }
        return { ...snap, ...parsed }
      })
    : []

  return (
    <div>
      <Header
        breadcrumbs={[
          { label: 'Analyzer', href: '/analyzer' },
          { label: facility.facilityName },
        ]}
      />
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <PageHeader
          title="Grant Strength Analyzer"
          description={`${facility.facilityName} · ${facility.organization.name}`}
          action={<RunAnalysisButton facilityId={facilityId} />}
        />

        {/* Analyzer provider info banner */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 mb-4 text-xs text-slate-500">
          <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {analyzerProvider === 'rules'
            ? 'Using rule-based analysis. Set ANALYZER_PROVIDER=anthropic to enable AI-powered review.'
            : `AI-powered review is active (provider: ${analyzerProvider}).`}
        </div>

        {/* Hero Card */}
        {analysis ? (
          <Card className="mb-6 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Overall Grant Strength Score</p>
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-bold text-slate-900 tracking-tight">
                      {analysis.overallScore}
                    </span>
                    <span className="text-xl text-slate-400 mb-1">/ 100</span>
                    {badge && (
                      <Badge
                        variant="outline"
                        className={`text-sm font-semibold mb-1 ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-slate-400">
                  <p>Last analyzed</p>
                  <p className="font-medium text-slate-600">
                    {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <Progress value={analysis.overallScore} className="h-3" />
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-slate-50 border border-slate-200 rounded-xl">
            <CardContent className="py-12 text-center">
              <BarChart2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium mb-1">No analysis run yet</p>
              <p className="text-sm text-slate-400">
                Click &ldquo;Run Analysis&rdquo; above to score this facility&rsquo;s grant application strength.
              </p>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <>
            {/* Score Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {dimensions.map((dim) => (
                <Card key={dim.label} className="bg-white border border-slate-200 shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`inline-flex p-1.5 rounded-md ${dim.bg}`}>
                        <dim.icon className={`h-3.5 w-3.5 ${dim.color}`} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{dim.label}</p>
                    </div>
                    <div className="flex items-end gap-1 mb-2">
                      <span className="text-2xl font-bold text-slate-900">{dim.score}</span>
                      <span className="text-sm text-slate-400 mb-0.5">/ 20</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                      <div
                        className="h-2 rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.min((dim.score / 20) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{dim.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Strengths Panel */}
              {analysis.strengthsSummary && (
                <Card className="bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-sm text-emerald-900 leading-relaxed">
                      {analysis.strengthsSummary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Weaknesses Panel */}
              {analysis.weaknessesSummary && (
                <Card className="bg-amber-50 border border-amber-200 rounded-xl">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-sm text-amber-900 leading-relaxed">
                      {analysis.weaknessesSummary}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Priority Fixes */}
            {analysis.priorityFixesSummary && (
              <Card className="mb-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    Priority Fixes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {analysis.priorityFixesSummary.split('\n').filter(Boolean).map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <span>{line.replace(/^\d+\.\s*/, '')}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Score History Chart */}
            <Card className="mb-6 bg-white border border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-600" />
                  Score History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreHistoryChart history={scoreHistory} />
                {scoreHistory.length >= 2 && (
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Dimension lines are scaled to 0–100 (each dimension is scored 0–20).
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Flags Table */}
            {sortedFlags.length > 0 && (
              <Card className="mb-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-800">
                    Analysis Flags ({sortedFlags.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {sortedFlags.map((flag) => (
                      <div key={flag.id} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {flag.severity === 'high' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : flag.severity === 'medium' ? (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Shield className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-slate-900">{flag.title}</p>
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize ${getSeverityBadge(flag.severity)}`}
                              >
                                {flag.severity}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize ${getCategoryBadge(flag.category)}`}
                              >
                                {flag.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{flag.explanation}</p>
                            <div className="flex items-start gap-1.5 bg-slate-50 rounded-md px-3 py-2">
                              <ChevronRight className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-slate-700">{flag.suggestedFix}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Analysis */}
            {projectSnapshots.length > 0 && (
              <Card className="mb-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-800">Project Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectSnapshots.map((snap) => {
                      const projBadge = getScoreBadge(snap.score)
                      return (
                        <div
                          key={snap.id}
                          className="border border-slate-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-900 truncate flex-1">
                              {snap.projectTitle || 'Project'}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className="text-lg font-bold text-slate-900">{snap.score}</span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${projBadge.className}`}
                              >
                                {projBadge.label}
                              </Badge>
                            </div>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                            <div
                              className="h-1.5 rounded-full bg-indigo-500"
                              style={{ width: `${snap.score}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                            <span className="text-slate-500">Threats linked:</span>
                            <span className="font-medium text-slate-700">
                              {snap.linkedThreatsCount ?? 0}
                            </span>
                            <span className="text-slate-500">Budget items:</span>
                            <span className="font-medium text-slate-700">
                              {snap.budgetItemCount ?? 0}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {[
                              { key: 'hasProblemStatement', label: 'Problem statement' },
                              { key: 'hasRationale', label: 'Risk rationale' },
                              { key: 'hasImplementationNotes', label: 'Implementation notes' },
                              { key: 'budgetHasJustifications', label: 'Budget justified' },
                            ].map(({ key, label }) => {
                              const val = snap[key as keyof typeof snap] as boolean | undefined
                              return (
                                <span
                                  key={key}
                                  className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
                                    val
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-red-50 text-red-700'
                                  }`}
                                >
                                  {val ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  {label}
                                </span>
                              )
                            })}
                          </div>

                          {snap.findings && Array.isArray(snap.findings) && snap.findings.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                              {(snap.findings as string[]).map((finding, i) => (
                                <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                                  <XCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                  {finding}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section Readiness — derived from live data in the analysis JSON */}
            {analysis.analysisJson && (() => {
              try {
                const parsed = JSON.parse(analysis.analysisJson)
                if (!parsed) return null
              } catch {
                return null
              }
              return null
            })()}
          </>
        )}

        {/* Section Readiness — always shown, derived live from DB */}
        <SectionReadinessPanel facilityId={facilityId} />

        {/* Narrative Improvement Suggestions */}
        <NarrativeImprovementsPanel facilityId={facilityId} />
      </div>
    </div>
  )
}

const IMPROVEMENT_SECTIONS = [
  { key: 'threat_overview', label: 'Threat Overview' },
  { key: 'vulnerability_statement', label: 'Vulnerability Statement' },
  { key: 'project_justification', label: 'Project Justification' },
  { key: 'budget_rationale', label: 'Budget Rationale' },
  { key: 'implementation_approach', label: 'Implementation Approach' },
  { key: 'executive_summary', label: 'Executive Summary' },
]

async function NarrativeImprovementsPanel({ facilityId }: { facilityId: string }) {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      threatAssessments: true,
      projectProposals: true,
      narrativeDrafts: {
        orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }],
      },
    },
  })

  if (!facility) return null

  // Get latest draft per section
  const latestDrafts = new Map<string, { id: string; editedText: string | null; generatedText: string | null }>()
  for (const draft of facility.narrativeDrafts) {
    if (!latestDrafts.has(draft.sectionName)) {
      latestDrafts.set(draft.sectionName, draft)
    }
  }

  // Generate improvements for each section
  const improvements: Array<{
    key: string
    label: string
    currentTextPreview: string
    detectedWeaknesses: string[]
    suggestedRewrite: string
  }> = []

  for (const section of IMPROVEMENT_SECTIONS) {
    const draft = latestDrafts.get(section.key)
    const currentText = draft?.editedText || draft?.generatedText || ''
    const result = generateNarrativeImprovements(section.key, currentText, facility)
    if (result.detectedWeaknesses.length > 0) {
      const preview = currentText.length > 100
        ? currentText.slice(0, 100).trimEnd() + '…'
        : currentText || '(no text yet)'
      improvements.push({
        key: section.key,
        label: section.label,
        currentTextPreview: preview,
        detectedWeaknesses: result.detectedWeaknesses,
        suggestedRewrite: result.suggestedRewrite,
      })
    }
  }

  if (improvements.length === 0) return null

  return (
    <Card className="mt-6 bg-white border border-slate-200 shadow-sm rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-800 flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-600" />
          Narrative Improvement Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {improvements.map((item) => (
            <div key={item.key} className="border border-slate-200 rounded-lg p-4">
              <p className="text-base font-semibold text-slate-900 mb-1">{item.label}</p>
              {item.currentTextPreview !== '(no text yet)' && (
                <p className="text-xs text-slate-400 italic mb-3">{item.currentTextPreview}</p>
              )}

              <div className="mb-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
                  Detected weaknesses
                </p>
                <ul className="space-y-1">
                  {item.detectedWeaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-amber-700 flex items-start gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Suggested rewrite — review before applying
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                  {item.suggestedRewrite}
                </div>
              </div>

              <ApplyRewriteButton
                facilityId={facilityId}
                sectionName={item.key}
                rewriteText={item.suggestedRewrite}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Server component for section readiness (reads live data)
async function SectionReadinessPanel({ facilityId }: { facilityId: string }) {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      threatAssessments: true,
      projectProposals: {
        include: {
          budgetItems: true,
          threatLinks: true,
        },
      },
      securityMeasures: true,
      narrativeDrafts: true,
    },
  })

  if (!facility) return null

  // Build section readiness inline (same logic as scoring.ts for display)
  const sections = []

  // Facility profile
  {
    const issues: string[] = []
    let score = 0
    if (facility.facilityName) score += 20
    if (facility.address) score += 20; else issues.push('Address missing')
    if (facility.populationServed) score += 20; else issues.push('Population served not documented')
    if (facility.daysHoursOfOperation) score += 20; else issues.push('Operating hours not documented')
    if (facility.occupancyNotes) score += 20; else issues.push('Occupancy notes missing')
    sections.push({ label: 'Facility Profile', ready: score >= 80, score, issues })
  }

  // Threat assessment
  {
    const issues: string[] = []
    const threats = facility.threatAssessments
    let score = 0
    if (threats.length >= 2) score += 40; else if (threats.length === 1) { score += 20; issues.push('Only 1 threat — add more') } else issues.push('No threats documented')
    const withHistory = threats.filter((t) => t.incidentHistory && t.incidentHistory.trim().length > 0)
    if (withHistory.length > 0) score += 30; else if (threats.length > 0) issues.push('No incident history on any threat')
    const withDesc = threats.filter((t) => t.description && t.description.split(/\s+/).length >= 15)
    if (withDesc.length > 0) score += 30; else if (threats.length > 0) issues.push('Threat descriptions too brief')
    sections.push({ label: 'Threat Assessment', ready: score >= 70, score, issues })
  }

  // Project proposals
  {
    const issues: string[] = []
    const projects = facility.projectProposals
    let score = 0
    if (projects.length > 0) score += 30; else issues.push('No project proposals')
    const withThreats = projects.filter((p) => (p.threatLinks || []).length > 0)
    if (withThreats.length === projects.length && projects.length > 0) score += 30; else if (projects.length > 0) issues.push('Some projects not linked to threats')
    const withBudget = projects.filter((p) => (p.budgetItems || []).length > 0)
    if (withBudget.length === projects.length && projects.length > 0) score += 20; else if (projects.length > 0) issues.push('Some projects missing budget items')
    const withStatement = projects.filter((p) => p.problemStatement && p.riskReductionRationale)
    if (withStatement.length === projects.length && projects.length > 0) score += 20; else if (projects.length > 0) issues.push('Some projects missing problem statement or rationale')
    sections.push({ label: 'Project Proposals', ready: score >= 70, score, issues })
  }

  // Narratives
  {
    const issues: string[] = []
    const narrativeSections = new Set(facility.narrativeDrafts.map((n) => n.sectionName))
    const required = ['executive_summary', 'threat_overview', 'vulnerability_statement', 'project_justification']
    let score = 0
    for (const req of required) {
      if (narrativeSections.has(req)) score += 25; else issues.push(`Missing: ${req.replace(/_/g, ' ')}`)
    }
    sections.push({ label: 'Narrative Drafts', ready: score >= 75, score, issues })
  }

  // Security measures
  {
    const issues: string[] = []
    const measures = facility.securityMeasures
    let score = 0
    if (measures.length > 0) score += 50; else issues.push('No security measures documented')
    const withGaps = measures.filter((m) => m.gapsRemaining && m.gapsRemaining.trim().length > 0)
    if (withGaps.length > 0) score += 50; else if (measures.length > 0) issues.push('No gaps documented')
    sections.push({ label: 'Existing Security Measures', ready: score >= 75, score, issues })
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-800">Section Readiness Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {section.ready ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium text-slate-700">{section.label}</p>
                </div>
                <span className="text-xs text-slate-400">{section.score}%</span>
              </div>
              <Progress value={section.score} className="h-1.5 mb-1" />
              {section.issues.length > 0 && (
                <ul className="space-y-0.5 mt-1">
                  {section.issues.map((issue, i) => (
                    <li key={i} className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
