export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { BarChart2, ArrowRight, Building2, Clock } from 'lucide-react'

function getScoreBadge(score: number): { label: string; className: string } {
  if (score >= 90) return { label: 'Excellent', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  if (score >= 80) return { label: 'Strong', className: 'bg-green-100 text-green-800 border-green-200' }
  if (score >= 60) return { label: 'Good', className: 'bg-blue-100 text-blue-800 border-blue-200' }
  if (score >= 40) return { label: 'Fair', className: 'bg-amber-100 text-amber-800 border-amber-200' }
  return { label: 'Needs Work', className: 'bg-red-100 text-red-800 border-red-200' }
}

async function getFacilitiesWithAnalysis() {
  const facilities = await prisma.site.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      organization: { select: { name: true } },
      grantAnalyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          overallScore: true,
          createdAt: true,
        },
      },
    },
  })
  return facilities
}

export default async function AnalyzerListPage() {
  const facilities = await getFacilitiesWithAnalysis()

  const analyzed = facilities.filter((f) => f.grantAnalyses.length > 0)
  const unanalyzed = facilities.filter((f) => f.grantAnalyses.length === 0)

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Grant Strength Analyzer' }]} />
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <PageHeader
          title="Grant Strength Analyzer"
          description="Select a facility to analyze its grant application strength across five key dimensions."
          action={
            <Link
              href="/analyzer/benchmark"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Compare All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />

        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl p-5 text-white mb-8">
          <div className="flex items-center gap-3">
            <BarChart2 className="h-7 w-7 text-indigo-200 flex-shrink-0" />
            <div>
              <p className="font-semibold text-base">How it works</p>
              <p className="text-sm text-indigo-200 mt-0.5">
                The analyzer scores your application across five dimensions: Risk Clarity, Vulnerability Specificity,
                Project Alignment, Budget Defensibility, and Narrative Quality — each worth up to 20 points for a total of 100.
              </p>
            </div>
          </div>
        </div>

        {analyzed.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Previously Analyzed</h2>
            <div className="grid gap-3">
              {analyzed.map((facility) => {
                const analysis = facility.grantAnalyses[0]!
                const badge = getScoreBadge(analysis.overallScore)
                return (
                  <Link key={facility.id} href={`/analyzer/${facility.id}`}>
                    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="inline-flex p-2 rounded-lg bg-indigo-50">
                              <Building2 className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{facility.siteName}</p>
                              <p className="text-xs text-slate-400">{facility.organization.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900 leading-none">{analysis.overallScore}</p>
                              <p className="text-xs text-slate-400 mt-0.5">/ 100</p>
                            </div>
                            <Badge variant="outline" className={`text-xs font-medium ${badge.className}`}>
                              {badge.label}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              {new Date(analysis.createdAt).toLocaleDateString()}
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {unanalyzed.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
              {analyzed.length > 0 ? 'Not Yet Analyzed' : 'Select a Facility'}
            </h2>
            <div className="grid gap-3">
              {unanalyzed.map((facility) => (
                <Link key={facility.id} href={`/analyzer/${facility.id}`}>
                  <Card className="bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex p-2 rounded-lg bg-slate-100">
                            <Building2 className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{facility.siteName}</p>
                            <p className="text-xs text-slate-400">{facility.organization.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs text-slate-500">
                            Not analyzed
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {facilities.length === 0 && (
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardContent className="py-12 text-center">
              <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No facilities found. Add a facility first before running an analysis.</p>
              <Button asChild variant="outline" className="mt-4" size="sm">
                <Link href="/sites/new">Add Facility</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
