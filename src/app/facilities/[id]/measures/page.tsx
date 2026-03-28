import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import { ScoreDisplay } from '@/components/shared/score-display'
import { Shield, Plus } from 'lucide-react'
import { MeasureActions } from './measure-actions'

export default async function MeasuresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      organization: true,
      securityMeasures: { orderBy: { category: 'asc' } },
    },
  })

  if (!facility) notFound()

  const avgEffectiveness = facility.securityMeasures.length > 0
    ? facility.securityMeasures.reduce((s, m) => s + m.effectivenessRating, 0) / facility.securityMeasures.length
    : 0

  const categories = [...new Set(facility.securityMeasures.map((m) => m.category))]

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/facilities' },
        { label: facility.facilityName, href: `/facilities/${id}` },
        { label: 'Security Measures' },
      ]} />
      <div className="p-8">
        <PageHeader
          title="Existing Security Measures"
          description={`Current security infrastructure at ${facility.facilityName}`}
          action={
            <Button asChild>
              <Link href={`/facilities/${id}/measures/new`}>
                <Plus className="h-4 w-4 mr-2" /> Add Measure
              </Link>
            </Button>
          }
        />

        {facility.securityMeasures.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{facility.securityMeasures.length}</p>
                <p className="text-xs text-muted-foreground">Total Measures</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{avgEffectiveness.toFixed(1)}<span className="text-sm text-muted-foreground">/5</span></p>
                <p className="text-xs text-muted-foreground">Avg Effectiveness</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{facility.securityMeasures.filter(m => m.effectivenessRating <= 2).length}</p>
                <p className="text-xs text-muted-foreground">Low Effectiveness</p>
              </CardContent>
            </Card>
          </div>
        )}

        {facility.securityMeasures.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No security measures documented"
            description="Document existing security infrastructure to establish baseline for your grant narrative."
            actionLabel="Add First Measure"
            actionHref={`/facilities/${id}/measures/new`}
          />
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">{cat}</h3>
                {facility.securityMeasures
                  .filter((m) => m.category === cat)
                  .map((measure) => (
                    <Card key={measure.id} className="mb-2">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">{measure.category}</Badge>
                              <ScoreDisplay
                                label="Effectiveness"
                                value={measure.effectivenessRating}
                                max={5}
                              />
                            </div>
                            {measure.description && (
                              <p className="text-sm text-gray-700 mb-1">{measure.description}</p>
                            )}
                            {measure.gapsRemaining && (
                              <p className="text-xs text-orange-700 mt-2">
                                <span className="font-medium">Gaps: </span>{measure.gapsRemaining}
                              </p>
                            )}
                            {measure.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{measure.notes}</p>
                            )}
                          </div>
                          <MeasureActions measureId={measure.id} facilityId={id} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
