import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import { Shield, Plus } from 'lucide-react'
import { MeasureList } from './measure-list'

export default async function MeasuresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.site.findUnique({
    where: { id },
    include: {
      organization: true,
      securityMeasures: { orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }] },
    },
  })

  if (!facility) notFound()

  const measures = facility.securityMeasures
  const included = measures.filter((m) => (m as any).includedInFiling !== false)
  const avgEffectiveness = included.length > 0
    ? included.reduce((s, m) => s + m.effectivenessRating, 0) / included.length
    : 0

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Sites', href: '/sites' },
        { label: facility.siteName, href: `/sites/${id}` },
        { label: 'Security Measures' },
      ]} />
      <div className="px-8 pb-16">

        {/* Page header */}
        <div className="pt-8 pb-6 flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Security baseline · {facility.siteName}</p>
            <h1 className="font-serif font-medium"
              style={{ fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Security Measures
            </h1>
            <p className="mt-1.5 text-[13.5px]" style={{ color: 'var(--ink-3)' }}>
              {measures.length} {measures.length === 1 ? 'measure' : 'measures'} documented ·{' '}
              {included.length} included in filing ·{' '}
              {included.length > 0 ? `avg. effectiveness ${avgEffectiveness.toFixed(1)}/5` : 'no included measures'}
            </p>
          </div>
          <Link
            href={`/sites/${id}/measures/new`}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-sm text-[13px] font-medium mt-0.5"
            style={{ background: 'var(--nav-accent)', color: '#fff', border: '1px solid var(--nav-accent)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Measure
          </Link>
        </div>

        {measures.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No security measures documented"
            description="Document existing security infrastructure to establish baseline for your grant narrative."
            actionLabel="Add First Measure"
            actionHref={`/sites/${id}/measures/new`}
          />
        ) : (
          <MeasureList
            measures={measures.map((m) => ({
              id: m.id,
              category: m.category,
              description: m.description,
              effectivenessRating: m.effectivenessRating,
              gapsRemaining: m.gapsRemaining,
              notes: m.notes,
              includedInFiling: (m as any).includedInFiling ?? true,
              sortOrder: (m as any).sortOrder ?? 0,
            }))}
            siteId={id}
          />
        )}
      </div>
    </div>
  )
}
