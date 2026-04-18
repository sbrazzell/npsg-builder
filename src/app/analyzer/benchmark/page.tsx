export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { getBenchmarkData } from '@/actions/analysis'
import { BarChart2, ArrowRight, Building2 } from 'lucide-react'

function getScoreBadge(score: number): { label: string; className: string } {
  if (score >= 90) return { label: 'Excellent', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  if (score >= 80) return { label: 'Strong', className: 'bg-green-100 text-green-800 border-green-200' }
  if (score >= 60) return { label: 'Good', className: 'bg-blue-100 text-blue-800 border-blue-200' }
  if (score >= 40) return { label: 'Fair', className: 'bg-amber-100 text-amber-800 border-amber-200' }
  return { label: 'Needs Work', className: 'bg-red-100 text-red-800 border-red-200' }
}

function formatRelativeDate(date: Date): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}yr ago`
}

export default async function BenchmarkPage() {
  const result = await getBenchmarkData()
  const rows = result.success && result.data ? result.data : []

  // Sort by overallScore desc to find the top site
  const sorted = [...rows].sort((a, b) => b.analysis.overallScore - a.analysis.overallScore)
  const topScore = sorted[0]?.analysis.overallScore ?? -1

  // Compute averages
  const count = rows.length
  const avg = (key: keyof typeof rows[0]['analysis']) => {
    if (count === 0) return 0
    let sum = 0
    for (const row of rows) {
      sum += row.analysis[key] as number
    }
    return Math.round(sum / count)
  }

  return (
    <div>
      <Header
        breadcrumbs={[
          { label: 'Analyzer', href: '/analyzer' },
          { label: 'Benchmark' },
        ]}
      />
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <PageHeader
          title="Comparative Benchmarking"
          description="Compare grant strength scores across all sites."
        />

        {rows.length === 0 ? (
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardContent className="py-12 text-center">
              <BarChart2 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                No sites have been analyzed yet. Run the analyzer on at least one site to see benchmark data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-indigo-600" />
                All Analyzed Sites ({rows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Site</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Organization</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Overall</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Risk</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Vuln.</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Alignment</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Budget</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Narrative</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Analyzed</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sorted.map((row) => {
                      const badge = getScoreBadge(row.analysis.overallScore)
                      const isTop = row.analysis.overallScore === topScore && topScore > 0
                      return (
                        <tr
                          key={row.siteId}
                          className={isTop ? 'bg-emerald-50' : 'hover:bg-slate-50 transition-colors'}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`inline-flex p-1.5 rounded-md ${isTop ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                <Building2 className={`h-3.5 w-3.5 ${isTop ? 'text-emerald-600' : 'text-slate-500'}`} />
                              </div>
                              <span className="font-medium text-slate-900">{row.siteName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{row.organizationName}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-lg font-bold text-slate-900">{row.analysis.overallScore}</span>
                              <Badge variant="outline" className={`text-xs ${badge.className}`}>
                                {badge.label}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-700">
                            {row.analysis.riskClarityScore}<span className="text-slate-400 font-normal">/20</span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-700">
                            {row.analysis.vulnerabilitySpecificityScore}<span className="text-slate-400 font-normal">/20</span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-700">
                            {row.analysis.projectAlignmentScore}<span className="text-slate-400 font-normal">/20</span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-700">
                            {row.analysis.budgetDefensibilityScore}<span className="text-slate-400 font-normal">/20</span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-700">
                            {row.analysis.narrativeQualityScore}<span className="text-slate-400 font-normal">/20</span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400 whitespace-nowrap text-xs">
                            {formatRelativeDate(row.analysis.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/analyzer/${row.siteId}`}
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium whitespace-nowrap"
                            >
                              View Report
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {count > 1 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Averages ({count} facilities)
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{avg('overallScore')}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-600">{avg('riskClarityScore')}<span className="text-slate-400 font-normal">/20</span></td>
                        <td className="px-4 py-3 text-center font-medium text-slate-600">{avg('vulnerabilitySpecificityScore')}<span className="text-slate-400 font-normal">/20</span></td>
                        <td className="px-4 py-3 text-center font-medium text-slate-600">{avg('projectAlignmentScore')}<span className="text-slate-400 font-normal">/20</span></td>
                        <td className="px-4 py-3 text-center font-medium text-slate-600">{avg('budgetDefensibilityScore')}<span className="text-slate-400 font-normal">/20</span></td>
                        <td className="px-4 py-3 text-center font-medium text-slate-600">{avg('narrativeQualityScore')}<span className="text-slate-400 font-normal">/20</span></td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
