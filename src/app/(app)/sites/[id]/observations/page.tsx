import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { getRiskBgClass, getRiskLevel } from '@/lib/scoring'
import { Eye, Plus, MapPin } from 'lucide-react'
import { ObservationActions } from './observation-actions'
import { ObservationForm } from './observation-form'

export default async function ObservationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.site.findUnique({
    where: { id },
    include: {
      organization: true,
      siteObservations: { orderBy: { severity: 'desc' } },
    },
  })

  if (!facility) notFound()

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Sites', href: '/sites' },
        { label: facility.siteName, href: `/sites/${id}` },
        { label: 'Site Observations' },
      ]} />
      <div className="p-4 md:p-8">
        <PageHeader
          title="Site Observations"
          description={`Field observations from site walkthrough at ${facility.siteName}`}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Observations List */}
          <div className="lg:col-span-2">
            {facility.siteObservations.length === 0 ? (
              <EmptyState
                icon={Eye}
                title="No observations recorded"
                description="Document field observations from your site walkthrough to support the security assessment narrative."
              />
            ) : (
              <div className="space-y-3">
                {facility.siteObservations.map((obs) => {
                  const sevLevel = obs.severity <= 2 ? 'low' : obs.severity <= 3 ? 'medium' : obs.severity <= 4 ? 'high' : 'critical'
                  return (
                    <Card key={obs.id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{obs.title}</h3>
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getRiskBgClass(sevLevel)}`}>
                                Severity {obs.severity}/5
                              </span>
                            </div>
                            {obs.observationType && (
                              <p className="text-xs text-muted-foreground mb-1">{obs.observationType}</p>
                            )}
                            {obs.locationDescription && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                {obs.locationDescription}
                              </p>
                            )}
                            {obs.notes && (
                              <p className="text-sm text-gray-700 mt-2">{obs.notes}</p>
                            )}
                          </div>
                          <ObservationActions observationId={obs.id} siteId={id} />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add Form */}
          <div>
            <Card>
              <CardContent className="pt-5">
                <h3 className="font-semibold text-gray-900 mb-4">Record Observation</h3>
                <ObservationForm siteId={id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
