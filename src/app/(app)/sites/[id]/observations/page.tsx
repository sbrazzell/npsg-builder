import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Eye } from 'lucide-react'
import { ObservationCard } from './observation-card'
import { ObservationForm } from './observation-form'
import { Card, CardContent } from '@/components/ui/card'

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
                {facility.siteObservations.map((obs) => (
                  <ObservationCard key={obs.id} obs={obs} siteId={id} />
                ))}
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
