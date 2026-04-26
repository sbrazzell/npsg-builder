export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { CreateDraftButton } from './create-draft-button'
import { DraftActions } from './draft-actions'
import { FilePlus, ChevronRight, CheckCircle2, Clock } from 'lucide-react'

export default async function FilingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const facility = await prisma.site.findUnique({
    where: { id },
    include: { organization: true },
  })
  if (!facility) notFound()

  // Query drafts separately so the Prisma $extends decryption extension fires
  // for ApplicationDraft — nested includes bypass model-level middleware.
  const drafts = await prisma.applicationDraft.findMany({
    where: { siteId: id },
    orderBy: { version: 'desc' },
  })
  const nextVersion = (drafts[0]?.version ?? 0) + 1
  const finalDraft = drafts.find((d) => d.status === 'final')

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Sites', href: '/sites' },
        { label: facility.siteName, href: `/sites/${id}` },
        { label: 'Filings' },
      ]} />
      <div className="p-4 md:p-8 max-w-4xl">
        <PageHeader
          title="Application Filings"
          description="Versioned snapshots of your grant application. Each draft captures all current data — freeze it, review the generated forms, and mark one Final when ready to submit."
          action={<CreateDraftButton siteId={id} nextVersion={nextVersion} />}
        />

        {/* Final filing callout */}
        {finalDraft && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">
                Final Filing: {finalDraft.title}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                v{finalDraft.version} · Saved {new Date(finalDraft.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0 border-emerald-300 text-emerald-800">
              <Link href={`/sites/${id}/filings/${finalDraft.id}`}>
                View Final <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        {drafts.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <FilePlus className="h-6 w-6 text-slate-400" />
            </div>
            <p className="font-semibold text-gray-900 mb-1">No drafts saved yet</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Save your first draft to freeze the current state of your application and generate NSGP form outputs.
            </p>
            <CreateDraftButton siteId={id} nextVersion={1} />
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => {
              const snapshot = JSON.parse(draft.snapshotJson)
              return (
                <Card key={draft.id} className={draft.status === 'final' ? 'border-emerald-200 bg-emerald-50/30' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {/* Version indicator */}
                      <div className="shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-600">v{draft.version}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-gray-900">{draft.title}</p>
                          {draft.status === 'final' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Final
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" /> Draft
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>Saved {new Date(draft.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{snapshot.threats?.length ?? 0} threats</span>
                          <span>{snapshot.projects?.length ?? 0} projects</span>
                          <span>${snapshot.totalBudget?.toLocaleString() ?? 0} total budget</span>
                          {snapshot.analysisScore != null && (
                            <span>Analysis score: {snapshot.analysisScore}/100</span>
                          )}
                        </div>
                        {draft.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5 italic">{draft.notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/sites/${id}/filings/${draft.id}`}>
                            View Forms <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
                        <DraftActions draftId={draft.id} siteId={id} status={draft.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
