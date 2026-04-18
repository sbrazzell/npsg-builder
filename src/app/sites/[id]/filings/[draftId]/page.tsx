export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DraftTabs } from './draft-tabs'
import { DraftActions } from '../draft-actions'
import { CheckCircle2, Clock, ChevronLeft } from 'lucide-react'
import type { FilingSnapshot } from '@/actions/filings'

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string; draftId: string }>
}) {
  const { id, draftId } = await params

  const [facility, draft] = await Promise.all([
    prisma.site.findUnique({ where: { id }, include: { organization: true } }),
    prisma.applicationDraft.findUnique({ where: { id: draftId } }),
  ])

  if (!facility || !draft || draft.siteId !== id) notFound()

  const snapshot: FilingSnapshot = JSON.parse(draft.snapshotJson)
  const capturedDate = new Date(snapshot.capturedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/sites' },
        { label: facility.siteName, href: `/sites/${id}` },
        { label: 'Filings', href: `/sites/${id}/filings` },
        { label: draft.title },
      ]} />

      <div className="p-4 md:p-6">
        {/* Title bar */}
        <div className="flex items-start justify-between gap-4 mb-4 no-print">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button asChild size="sm" variant="ghost" className="-ml-2 text-muted-foreground">
                <Link href={`/sites/${id}/filings`}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> All Filings
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{draft.title}</h1>
              <span className="text-sm text-muted-foreground">v{draft.version}</span>
              {draft.status === 'final' ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Final
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" /> Draft
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Snapshot captured {capturedDate} ·{' '}
              {snapshot.threats.length} threats ·{' '}
              {snapshot.projects.length} projects ·{' '}
              ${snapshot.totalBudget.toLocaleString()} total budget
              {snapshot.analysisScore != null ? ` · Analysis: ${snapshot.analysisScore}/100` : ''}
            </p>
            {draft.notes && (
              <p className="text-sm text-muted-foreground mt-1 italic">{draft.notes}</p>
            )}
          </div>
          <div className="shrink-0">
            <DraftActions draftId={draft.id} siteId={id} status={draft.status} />
          </div>
        </div>

        {/* Form tabs */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <DraftTabs snapshot={snapshot} />
        </div>
      </div>
    </div>
  )
}
