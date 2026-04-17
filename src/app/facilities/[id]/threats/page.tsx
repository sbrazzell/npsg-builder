import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import { RiskBadge } from '@/components/shared/risk-badge'
import { calculateRiskScore, getRiskLevel, getRiskColor } from '@/lib/scoring'
import { AlertTriangle, BadgeCheck, Plus } from 'lucide-react'
import { ThreatActions } from './threat-actions'
import { THREAT_SOURCES } from '@/lib/validations'

export default async function ThreatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      organization: true,
      threatAssessments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!facility) notFound()

  const sorted = [...facility.threatAssessments].sort(
    (a, b) => calculateRiskScore(b.likelihood, b.impact) - calculateRiskScore(a.likelihood, a.impact)
  )

  // Build threat matrix data
  const matrixCells: Record<string, string[]> = {}
  for (const t of facility.threatAssessments) {
    const key = `${t.likelihood}-${t.impact}`
    if (!matrixCells[key]) matrixCells[key] = []
    matrixCells[key].push(t.threatType)
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/facilities' },
        { label: facility.facilityName, href: `/facilities/${id}` },
        { label: 'Threat Assessments' },
      ]} />
      <div className="p-4 md:p-8">
        <PageHeader
          title="Threat Assessments"
          description={`Documented threats for ${facility.facilityName}`}
          action={
            <Button asChild>
              <Link href={`/facilities/${id}/threats/new`}>
                <Plus className="h-4 w-4 mr-2" /> Add Threat
              </Link>
            </Button>
          }
        />

        {facility.threatAssessments.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No threats documented yet"
            description="Document threats to build the risk analysis section of your grant application."
            actionLabel="Add First Threat"
            actionHref={`/facilities/${id}/threats/new`}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Threat List */}
            <div className="lg:col-span-2 space-y-3">
              {sorted.map((threat) => (
                <Card key={threat.id} className="relative">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{threat.threatType}</h3>
                          <RiskBadge likelihood={threat.likelihood} impact={threat.impact} />
                          {(threat as any).source && (threat as any).source !== 'self_assessed' && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              (threat as any).source === 'law_enforcement'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : (threat as any).source === 'third_party'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}>
                              {(threat as any).source === 'law_enforcement' && <BadgeCheck className="h-3 w-3" />}
                              {THREAT_SOURCES.find(s => s.value === (threat as any).source)?.label ?? (threat as any).source}
                              {(threat as any).sourceAgency ? ` — ${(threat as any).sourceAgency}` : ''}
                            </span>
                          )}
                        </div>
                        {threat.description && (
                          <p className="text-sm text-muted-foreground mb-2">{threat.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Likelihood: <strong>{threat.likelihood}/5</strong></span>
                          <span>Impact: <strong>{threat.impact}/5</strong></span>
                          <span>Score: <strong>{calculateRiskScore(threat.likelihood, threat.impact)}</strong></span>
                        </div>
                        {threat.vulnerabilityNotes && (
                          <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                            <span className="font-medium">Vulnerability: </span>{threat.vulnerabilityNotes}
                          </p>
                        )}
                        {threat.incidentHistory && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">History: </span>{threat.incidentHistory}
                          </p>
                        )}
                      </div>
                      <ThreatActions threatId={threat.id} facilityId={id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Threat Matrix */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Risk Matrix</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-3 text-center">Likelihood (x) vs. Impact (y)</div>
                  <div className="grid" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)' }}>
                    {/* Header row */}
                    <div />
                    {[1,2,3,4,5].map(l => (
                      <div key={l} className="text-xs text-center text-muted-foreground p-1 font-medium">{l}</div>
                    ))}
                    {/* Data rows - impact descending */}
                    {[5,4,3,2,1].map(impact => (
                      <>
                        <div key={`row-${impact}`} className="text-xs text-center text-muted-foreground p-1 font-medium flex items-center justify-center">{impact}</div>
                        {[1,2,3,4,5].map(likelihood => {
                          const score = likelihood * impact
                          const level = getRiskLevel(score)
                          const color = getRiskColor(level)
                          const threats = matrixCells[`${likelihood}-${impact}`] || []
                          return (
                            <div
                              key={`${likelihood}-${impact}`}
                              className="aspect-square border rounded-sm m-0.5 flex items-center justify-center text-xs"
                              style={{ backgroundColor: threats.length > 0 ? color + '40' : 'transparent', borderColor: color + '60' }}
                              title={threats.join(', ')}
                            >
                              {threats.length > 0 && (
                                <span className="font-bold" style={{ color }}>{threats.length}</span>
                              )}
                            </div>
                          )
                        })}
                      </>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1">
                    {[
                      { label: 'Low (1-4)', color: '#22c55e' },
                      { label: 'Medium (5-9)', color: '#f59e0b' },
                      { label: 'High (10-16)', color: '#f97316' },
                      { label: 'Critical (17-25)', color: '#ef4444' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color + '60', border: `1px solid ${item.color}` }} />
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
