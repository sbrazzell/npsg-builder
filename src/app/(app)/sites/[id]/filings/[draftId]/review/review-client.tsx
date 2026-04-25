'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Loader2, Clock, BarChart2, ShieldAlert, ShieldCheck, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { runReview } from '@/actions/application-review'
import { ScoreDashboard } from './score-dashboard'
import { FindingCard } from './finding-card'
import type { ApplicationReview, ReviewHistoryEntry } from '@/lib/application-review/types'
import {
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
  CATEGORY_LABELS,
  type FindingCategory,
} from '@/lib/application-review/types'

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ApplicationReview['reviewStatus'] }) {
  const colors = REVIEW_STATUS_COLORS[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {REVIEW_STATUS_LABELS[status]}
    </span>
  )
}

// ── Summary panel ─────────────────────────────────────────────────────────────

function SummaryPanel({ summary }: { summary: ApplicationReview['summary'] }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-700 leading-relaxed">{summary.overallReadiness}</p>
      </div>

      {summary.biggestBlockers.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" /> Biggest Blockers
          </h4>
          <ul className="space-y-1">
            {summary.biggestBlockers.map((b, i) => (
              <li key={i} className="text-sm text-red-800 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-red-400">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.topImprovements.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2 flex items-center gap-1">
            <Lightbulb className="h-3.5 w-3.5" /> Top Improvements
          </h4>
          <ul className="space-y-1">
            {summary.topImprovements.map((imp, i) => (
              <li key={i} className="text-sm text-blue-800 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-blue-400">{i + 1}.</span>
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.estimatedReviewerConcerns.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Estimated Reviewer Concerns
          </h4>
          <ul className="space-y-1">
            {summary.estimatedReviewerConcerns.map((c, i) => (
              <li key={i} className="text-sm text-amber-800 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-amber-500">⚑</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-0.5">
          Suggested Next Action
        </p>
        <p className="text-sm text-slate-800">{summary.suggestedNextAction}</p>
      </div>
    </div>
  )
}

// ── Findings section ──────────────────────────────────────────────────────────

const CATEGORIES: FindingCategory[] = [
  'completeness',
  'threat_quality',
  'vulnerability',
  'project_alignment',
  'budget',
  'implementation',
  'sustainment',
  'export_readiness',
]

function FindingsSection({
  review,
  onReviewUpdate,
}: {
  review: ApplicationReview
  onReviewUpdate: (r: ApplicationReview) => void
}) {
  const [filter, setFilter] = useState<'all' | 'blocker' | 'warning' | 'suggestion'>('all')
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | 'all'>('all')

  const blockers = review.findings.filter((f) => f.severity === 'blocker')
  const warnings = review.findings.filter((f) => f.severity === 'warning')
  const suggestions = review.findings.filter((f) => f.severity === 'suggestion')

  const filteredFindings = review.findings.filter((f) => {
    if (filter !== 'all' && f.severity !== filter) return false
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false
    return true
  })

  const activeFindings = filteredFindings.filter((f) => !f.resolved && !f.rejected)
  const doneFindings = filteredFindings.filter((f) => f.resolved || f.rejected)

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(['all', 'blocker', 'warning', 'suggestion'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 transition-colors ${
                filter === s
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? `All (${review.findings.length})` : null}
              {s === 'blocker' ? `🚫 ${blockers.length}` : null}
              {s === 'warning' ? `⚠️ ${warnings.length}` : null}
              {s === 'suggestion' ? `💡 ${suggestions.length}` : null}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FindingCategory | 'all')}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>

        <span className="text-xs text-gray-400 ml-auto">
          {activeFindings.length} active · {review.resolvedCount} resolved
        </span>
      </div>

      {/* Active findings */}
      {activeFindings.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No active findings in this view.
        </div>
      )}

      <div className="space-y-2">
        {activeFindings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            reviewId={review.id}
            onReviewUpdate={onReviewUpdate}
          />
        ))}
      </div>

      {/* Resolved / dismissed */}
      {doneFindings.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600 select-none">
            {doneFindings.length} resolved / dismissed finding{doneFindings.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1.5">
            {doneFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                reviewId={review.id}
                onReviewUpdate={onReviewUpdate}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Review history table ──────────────────────────────────────────────────────

function ReviewHistoryTable({ history }: { history: ReviewHistoryEntry[] }) {
  if (history.length <= 1) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" /> Review History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="text-left pb-2 font-medium">Date</th>
                <th className="text-left pb-2 font-medium">Score</th>
                <th className="text-left pb-2 font-medium">Status</th>
                <th className="text-right pb-2 font-medium">Findings</th>
                <th className="text-right pb-2 font-medium">Resolved</th>
                <th className="text-right pb-2 font-medium">Blockers</th>
              </tr>
            </thead>
            <tbody>
              {history.map((run, i) => (
                <tr key={run.id} className={`border-b last:border-0 ${i === 0 ? 'font-medium' : 'text-gray-500'}`}>
                  <td className="py-2">
                    {new Date(run.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                    {i === 0 && <span className="ml-1 text-[9px] text-blue-600 font-bold">LATEST</span>}
                  </td>
                  <td className={`py-2 font-bold ${run.overallScore >= 75 ? 'text-emerald-600' : run.overallScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {run.overallScore}
                  </td>
                  <td className="py-2">
                    {REVIEW_STATUS_LABELS[run.reviewStatus]}
                  </td>
                  <td className="py-2 text-right">{run.totalFindings}</td>
                  <td className="py-2 text-right text-emerald-600">{run.resolvedCount}</td>
                  <td className={`py-2 text-right ${run.unresolvedBlockers > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {run.unresolvedBlockers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

interface ReviewClientProps {
  draftId: string
  siteId: string
  draftTitle: string
  initialReview: ApplicationReview | null
  history: ReviewHistoryEntry[]
}

export function ReviewClient({
  draftId,
  siteId,
  draftTitle,
  initialReview,
  history,
}: ReviewClientProps) {
  const [review, setReview] = useState<ApplicationReview | null>(initialReview)
  const [historyEntries, setHistoryEntries] = useState<ReviewHistoryEntry[]>(history)
  const [isPending, startTransition] = useTransition()

  function handleRunReview() {
    startTransition(async () => {
      const newReview = await runReview(draftId)
      setReview(newReview)
      // Add to history
      setHistoryEntries((prev) => [
        {
          id: newReview.id,
          draftId: newReview.draftId,
          createdAt: newReview.createdAt,
          overallScore: newReview.scores.overall,
          reviewStatus: newReview.reviewStatus,
          totalFindings: newReview.totalFindings,
          blockerCount: newReview.blockerCount,
          resolvedCount: newReview.resolvedCount,
          unresolvedBlockers: newReview.unresolvedBlockers,
        },
        ...prev,
      ])
    })
  }

  return (
    <div className="space-y-6">
      {/* Run / re-run bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
        <div>
          <p className="text-sm font-medium text-slate-800">
            {review
              ? `Last reviewed ${new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : 'Run a review to see findings and scores for this draft.'}
          </p>
          {review && (
            <p className="text-xs text-slate-500 mt-0.5">
              {review.totalFindings} findings · {review.resolvedCount} resolved · {review.unresolvedBlockers} unresolved blockers
            </p>
          )}
        </div>
        <Button
          onClick={handleRunReview}
          disabled={isPending}
          className="shrink-0"
          variant={review ? 'outline' : 'default'}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reviewing…</>
          ) : review ? (
            <><RefreshCw className="h-4 w-4 mr-2" /> Re-run Review</>
          ) : (
            <><BarChart2 className="h-4 w-4 mr-2" /> Run Review</>
          )}
        </Button>
      </div>

      {review && (
        <>
          {/* Status + score row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Readiness Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StatusBadge status={review.reviewStatus} />

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-xl font-bold text-red-700">{review.blockerCount}</p>
                    <p className="text-[10px] text-red-600 font-medium uppercase">Blockers</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-xl font-bold text-amber-700">{review.warningCount}</p>
                    <p className="text-[10px] text-amber-600 font-medium uppercase">Warnings</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-xl font-bold text-blue-700">{review.suggestionCount}</p>
                    <p className="text-[10px] text-blue-600 font-medium uppercase">Suggestions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Readiness Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreDashboard scores={review.scores} />
              </CardContent>
            </Card>
          </div>

          {/* Summary panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Reviewer Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryPanel summary={review.summary} />
            </CardContent>
          </Card>

          {/* Findings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Findings
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({review.totalFindings} total)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsSection review={review} onReviewUpdate={setReview} />
            </CardContent>
          </Card>

          {/* History */}
          <ReviewHistoryTable history={historyEntries} />
        </>
      )}
    </div>
  )
}
