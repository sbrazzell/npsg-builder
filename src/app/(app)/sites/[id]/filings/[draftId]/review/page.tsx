export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ClipboardCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { getLatestReview, getReviewHistory } from '@/actions/application-review'
import { ReviewClient } from './review-client'

export default async function ReviewPage({
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

  const [latestReview, history] = await Promise.all([
    getLatestReview(draftId),
    getReviewHistory(draftId),
  ])

  return (
    <div>
      <Header
        breadcrumbs={[
          { label: 'Sites', href: '/sites' },
          { label: facility.siteName, href: `/sites/${id}` },
          { label: 'Filings', href: `/sites/${id}/filings` },
          { label: draft.title, href: `/sites/${id}/filings/${draftId}` },
          { label: 'Review' },
        ]}
      />

      <div className="p-4 md:p-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <Button asChild size="sm" variant="ghost" className="-ml-2 text-muted-foreground mb-2">
              <Link href={`/sites/${id}/filings/${draftId}`}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Draft
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-6 w-6 text-slate-700" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Review My Application</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {facility.organization.name} · {draft.title} · v{draft.version}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Run a structured review of this draft to identify gaps, score readiness, and get
              proposed improvements you can accept, edit, or dismiss.
            </p>
          </div>
        </div>

        <ReviewClient
          draftId={draftId}
          siteId={id}
          draftTitle={draft.title}
          initialReview={latestReview}
          history={history}
        />
      </div>
    </div>
  )
}
