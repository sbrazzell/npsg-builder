import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import { Eye } from 'lucide-react'
import { ObservationList } from './observation-list'
import { ObservationForm } from './observation-form'
import { Card, CardContent } from '@/components/ui/card'

export default async function ObservationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.site.findUnique({
    where: { id },
    include: {
      organization: true,
      siteObservations: { orderBy: [{ sortOrder: 'asc' }, { severity: 'desc' }] },
    },
  })

  if (!facility) notFound()

  const siblingSites = await prisma.site.findMany({
    where: { organizationId: facility.organizationId, NOT: { id } },
    select: { id: true, siteName: true },
    orderBy: { siteName: 'asc' },
  })

  const observations = facility.siteObservations.map((o) => ({
    id: o.id,
    siteId: id,
    title: o.title,
    locationDescription: o.locationDescription,
    observationType: o.observationType,
    severity: o.severity,
    notes: o.notes,
    includedInFiling: (o as any).includedInFiling ?? true,
    sortOrder: (o as any).sortOrder ?? 0,
  }))

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Sites', href: '/sites' },
        { label: facility.siteName, href: `/sites/${id}` },
        { label: 'Site Observations' },
      ]} />
      <div className="px-8 pb-16">

        {/* Page header */}
        <div className="pt-8 pb-6">
          <p className="eyebrow mb-2">Field walkthrough · {facility.siteName}</p>
          <h1 className="font-serif font-medium"
            style={{ fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Site Observations
          </h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: 'var(--ink-3)' }}>
            {observations.length} {observations.length === 1 ? 'observation' : 'observations'} ·{' '}
            {observations.filter(o => o.includedInFiling).length} included in filing
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2">
            {observations.length === 0 ? (
              <EmptyState
                icon={Eye}
                title="No observations recorded"
                description="Document field observations from your site walkthrough to support the security assessment narrative."
              />
            ) : (
              <ObservationList observations={observations} siteId={id} siblingSites={siblingSites} />
            )}
          </div>

          {/* Add form */}
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
