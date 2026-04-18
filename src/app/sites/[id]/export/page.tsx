export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'
import { ExportButtons } from './export-buttons'
import { getLatestAnalysis } from '@/actions/analysis'

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.site.findUnique({
    where: { id },
    include: {
      organization: true,
      threatAssessments: { orderBy: [{ likelihood: 'desc' }, { impact: 'desc' }] },
      securityMeasures: { orderBy: { category: 'asc' } },
      projectProposals: {
        include: {
          budgetItems: { orderBy: { createdAt: 'asc' } },
          threatLinks: { include: { threat: true } },
        },
        orderBy: { priority: 'asc' },
      },
      siteObservations: { orderBy: { severity: 'desc' } },
      narrativeDrafts: {
        orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }],
      },
    },
  })

  if (!facility) notFound()

  // Fetch latest analysis for export
  const analysisResult = await getLatestAnalysis(id)
  const analysis = analysisResult.success ? analysisResult.data : null

  // Get latest narrative per section
  const latestNarratives = new Map<string, string>()
  for (const draft of facility.narrativeDrafts) {
    if (!latestNarratives.has(draft.sectionName)) {
      latestNarratives.set(draft.sectionName, draft.editedText || draft.generatedText || '')
    }
  }

  let totalBudget = 0
  for (const p of facility.projectProposals) {
    for (const b of p.budgetItems) { totalBudget += b.totalCost }
  }

  const org = facility.organization

  const SECTION_LABELS: Record<string, string> = {
    executive_summary: 'Executive Summary',
    threat_overview: 'Threat Overview',
    vulnerability_statement: 'Vulnerability Statement',
    project_justification: 'Project Justification',
    implementation_approach: 'Implementation Approach',
    budget_rationale: 'Budget Rationale',
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/sites' },
        { label: facility.siteName, href: `/sites/${id}` },
        { label: 'Export' },
      ]} />
      <div className="p-4 md:p-8">
        <PageHeader
          title="Export Application"
          description="Download your completed grant application package."
          action={<ExportButtons siteId={id} siteName={facility.siteName} />}
        />

        {/* Printable Document */}
        <div id="export-content" className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="print:shadow-none print:border-0">
            {/* Cover */}
            <div className="bg-slate-900 text-white px-12 py-10 print:py-16">
              <p className="text-sm text-slate-400 mb-1">NONPROFIT SECURITY GRANT PROGRAM</p>
              <h1 className="text-3xl font-bold mb-2">{org.name}</h1>
              <h2 className="text-xl font-light text-slate-300 mb-6">{facility.siteName}</h2>
              <div className="flex gap-6 text-sm text-slate-300">
                {org.address && <span>{org.address}{org.city ? `, ${org.city}` : ''}{org.state ? `, ${org.state}` : ''}</span>}
                {org.einOrTaxId && <span>EIN: {org.einOrTaxId}</span>}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-700 flex gap-8 text-sm">
                <div>
                  <p className="text-slate-400">Total Requested</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalBudget)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Project Count</p>
                  <p className="text-2xl font-bold">{facility.projectProposals.length}</p>
                </div>
                <div>
                  <p className="text-slate-400">Threat Assessments</p>
                  <p className="text-2xl font-bold">{facility.threatAssessments.length}</p>
                </div>
              </div>
            </div>

            <div className="px-12 py-8 space-y-10">
              {/* Narratives */}
              {Array.from(latestNarratives.entries()).map(([key, text]) => (
                <section key={key}>
                  <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">{SECTION_LABELS[key] || key}</h2>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
                </section>
              ))}

              {/* Facility Details */}
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">Facility Profile</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {facility.populationServed && (
                    <div>
                      <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Population Served</p>
                      <p>{facility.populationServed}</p>
                    </div>
                  )}
                  {facility.daysHoursOfOperation && (
                    <div>
                      <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Hours of Operation</p>
                      <p>{facility.daysHoursOfOperation}</p>
                    </div>
                  )}
                  {facility.surroundingAreaNotes && (
                    <div className="col-span-2">
                      <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Surrounding Area</p>
                      <p>{facility.surroundingAreaNotes}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Threat Assessments */}
              {facility.threatAssessments.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">Threat Assessment Matrix</h2>
                  <table className="w-full text-sm border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border p-2 text-left font-semibold">Threat</th>
                        <th className="border p-2 text-center font-semibold">Likelihood</th>
                        <th className="border p-2 text-center font-semibold">Impact</th>
                        <th className="border p-2 text-center font-semibold">Risk Score</th>
                        <th className="border p-2 text-center font-semibold">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facility.threatAssessments.map((t) => {
                        const score = calculateRiskScore(t.likelihood, t.impact)
                        const level = getRiskLevel(score)
                        return (
                          <tr key={t.id} className="even:bg-slate-50">
                            <td className="border p-2">
                              <p className="font-medium">{t.threatType}</p>
                              {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                            </td>
                            <td className="border p-2 text-center">{t.likelihood}</td>
                            <td className="border p-2 text-center">{t.impact}</td>
                            <td className="border p-2 text-center font-semibold">{score}</td>
                            <td className="border p-2 text-center capitalize">{level}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </section>
              )}

              {/* Projects & Budgets */}
              {facility.projectProposals.map((project) => {
                const budget = project.budgetItems.reduce((s: number, b) => s + b.totalCost, 0)
                return (
                  <section key={project.id}>
                    <h2 className="text-lg font-bold text-gray-900 mb-1 pb-2 border-b">
                      Project: {project.title}
                      <span className="ml-3 text-base font-normal text-emerald-700">{formatCurrency(budget)}</span>
                    </h2>

                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Problem Statement</p>
                        <p>{project.problemStatement || '—'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Proposed Solution</p>
                        <p>{project.proposedSolution || '—'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Risk Reduction</p>
                        <p>{project.riskReductionRationale || '—'}</p>
                      </div>
                    </div>

                    {project.budgetItems.length > 0 && (
                      <table className="w-full text-sm border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border p-2 text-left">Item</th>
                            <th className="border p-2 text-left">Category</th>
                            <th className="border p-2 text-right">Qty</th>
                            <th className="border p-2 text-right">Unit Cost</th>
                            <th className="border p-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {project.budgetItems.map((item) => (
                            <tr key={item.id} className="even:bg-slate-50">
                              <td className="border p-2">
                                <p className="font-medium">{item.itemName}</p>
                                {item.justification && <p className="text-xs text-gray-500">{item.justification}</p>}
                              </td>
                              <td className="border p-2">{item.category}</td>
                              <td className="border p-2 text-right">{item.quantity}</td>
                              <td className="border p-2 text-right">{formatCurrency(item.unitCost)}</td>
                              <td className="border p-2 text-right font-medium">{formatCurrency(item.totalCost)}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 font-semibold">
                            <td colSpan={4} className="border p-2 text-right">Project Total</td>
                            <td className="border p-2 text-right text-emerald-700">{formatCurrency(budget)}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </section>
                )
              })}

              {/* Total */}
              <section className="bg-slate-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Grant Request</p>
                    <p className="text-3xl font-bold text-emerald-700">{formatCurrency(totalBudget)}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{facility.projectProposals.length} project(s)</p>
                    <p>{facility.projectProposals.flatMap(p => p.budgetItems).length} budget items</p>
                  </div>
                </div>
              </section>

              {/* Grant Strength Analysis */}
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">Grant Strength Analysis</h2>
                {analysis ? (
                  <div className="space-y-5">
                    {/* Score header */}
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Overall Score</p>
                        <p className="text-4xl font-bold text-gray-900 leading-none">{analysis.overallScore}<span className="text-lg font-normal text-gray-400"> / 100</span></p>
                      </div>
                      <div className="ml-2">
                        <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full border ${
                          analysis.overallScore >= 90 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          analysis.overallScore >= 80 ? 'bg-green-50 text-green-800 border-green-200' :
                          analysis.overallScore >= 60 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          analysis.overallScore >= 40 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          {analysis.overallScore >= 90 ? 'Excellent' :
                           analysis.overallScore >= 80 ? 'Strong' :
                           analysis.overallScore >= 60 ? 'Good' :
                           analysis.overallScore >= 40 ? 'Fair' : 'Needs Work'}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          Analyzed {new Date(analysis.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Dimension scores table */}
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border p-2 text-left font-semibold">Dimension</th>
                          <th className="border p-2 text-center font-semibold">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="even:bg-slate-50">
                          <td className="border p-2">Risk Clarity</td>
                          <td className="border p-2 text-center font-medium">{analysis.riskClarityScore}/20</td>
                        </tr>
                        <tr className="even:bg-slate-50">
                          <td className="border p-2">Vulnerability Specificity</td>
                          <td className="border p-2 text-center font-medium">{analysis.vulnerabilitySpecificityScore}/20</td>
                        </tr>
                        <tr className="even:bg-slate-50">
                          <td className="border p-2">Project Alignment</td>
                          <td className="border p-2 text-center font-medium">{analysis.projectAlignmentScore}/20</td>
                        </tr>
                        <tr className="even:bg-slate-50">
                          <td className="border p-2">Budget Defensibility</td>
                          <td className="border p-2 text-center font-medium">{analysis.budgetDefensibilityScore}/20</td>
                        </tr>
                        <tr className="even:bg-slate-50">
                          <td className="border p-2">Narrative Quality</td>
                          <td className="border p-2 text-center font-medium">{analysis.narrativeQualityScore}/20</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Strengths */}
                    {analysis.strengthsSummary && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Strengths</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {analysis.strengthsSummary.split(/[.,]/).filter((s) => s.trim().length > 10).map((s, i) => (
                            <li key={i} className="text-sm text-gray-700">{s.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {analysis.weaknessesSummary && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Weaknesses</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {analysis.weaknessesSummary.split(/[.,]/).filter((s) => s.trim().length > 10).map((s, i) => (
                            <li key={i} className="text-sm text-gray-700">{s.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Priority fixes */}
                    {analysis.priorityFixesSummary && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Priority Fixes</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {analysis.priorityFixesSummary.split('\n').filter(Boolean).map((line, i) => (
                            <li key={i} className="text-sm text-gray-700">{line.replace(/^\d+\.\s*/, '')}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* High/Medium flags */}
                    {analysis.flags && analysis.flags.filter((f) => f.severity !== 'low').length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Flags</p>
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="border p-2 text-left font-semibold">Category</th>
                              <th className="border p-2 text-left font-semibold">Flag</th>
                              <th className="border p-2 text-left font-semibold">Suggested Fix</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.flags
                              .filter((f) => f.severity !== 'low')
                              .map((flag) => (
                                <tr key={flag.id} className="even:bg-slate-50 align-top">
                                  <td className="border p-2 capitalize whitespace-nowrap">{flag.category}</td>
                                  <td className="border p-2">{flag.title}</td>
                                  <td className="border p-2 text-gray-600">{flag.suggestedFix}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-500">
                    No analysis run yet. Visit the{' '}
                    <Link href={`/analyzer/${id}`} className="text-indigo-600 underline">
                      Grant Strength Analyzer
                    </Link>{' '}
                    to generate a strength report.
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          #export-content { box-shadow: none; border: none; }
        }
      `}</style>
    </div>
  )
}
