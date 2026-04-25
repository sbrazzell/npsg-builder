'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Check, X, Edit3, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { acceptFix, rejectFinding, markFindingResolved } from '@/actions/application-review'
import type { ReviewFinding, ApplicationReview } from '@/lib/application-review/types'
import { CATEGORY_LABELS } from '@/lib/application-review/types'

const SEVERITY_CONFIG = {
  blocker: {
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-800 border-red-300',
    icon: '🚫',
    label: 'Blocker',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: '⚠️',
    label: 'Warning',
  },
  suggestion: {
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '💡',
    label: 'Suggestion',
  },
}

interface FindingCardProps {
  finding: ReviewFinding
  reviewId: string
  onReviewUpdate: (review: ApplicationReview) => void
}

export function FindingCard({ finding, reviewId, onReviewUpdate }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [fixMode, setFixMode] = useState<'preview' | 'edit' | null>(null)
  const [editedText, setEditedText] = useState('')
  const [isPending, startTransition] = useTransition()

  const config = SEVERITY_CONFIG[finding.severity]
  const isActionable = !finding.resolved && !finding.rejected

  function handleAcceptFix(text?: string) {
    startTransition(async () => {
      const { review } = await acceptFix(reviewId, finding.id, text)
      onReviewUpdate(review)
      setFixMode(null)
    })
  }

  function handleReject() {
    startTransition(async () => {
      const review = await rejectFinding(reviewId, finding.id)
      onReviewUpdate(review)
    })
  }

  function handleMarkResolved() {
    startTransition(async () => {
      const review = await markFindingResolved(reviewId, finding.id)
      onReviewUpdate(review)
    })
  }

  function handleEditBeforeAccepting() {
    setEditedText(finding.proposedFix?.proposed ?? '')
    setFixMode('edit')
  }

  if (finding.resolved) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
        <span className="text-emerald-800 font-medium">{finding.title}</span>
        <span className="text-emerald-600 text-xs ml-auto">Resolved</span>
      </div>
    )
  }

  if (finding.rejected) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm opacity-60">
        <X className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-gray-500 line-through">{finding.title}</span>
        <span className="text-gray-400 text-xs ml-auto">Dismissed</span>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${config.bg}`}>
      {/* Header row */}
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="shrink-0 text-base mt-0.5">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${config.badge}`}>
              {config.label}
            </span>
            <span className="text-[10px] text-gray-500 font-mono uppercase">
              {CATEGORY_LABELS[finding.category]}
            </span>
            {finding.canAutoFix && (
              <span className="text-[10px] text-violet-700 font-semibold bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                AUTO-FIX AVAILABLE
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900">{finding.title}</p>
          {finding.affectedEntityLabel && (
            <p className="text-xs text-gray-500 mt-0.5">
              {finding.affectedSection} — <span className="italic">{finding.affectedEntityLabel}</span>
            </p>
          )}
          {!finding.affectedEntityLabel && (
            <p className="text-xs text-gray-500 mt-0.5">{finding.affectedSection}</p>
          )}
        </div>
        <div className="shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-black/10 pt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Explanation
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">{finding.explanation}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Recommended Action
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{finding.recommendedAction}</p>
          </div>

          {/* Proposed fix panel */}
          {finding.canAutoFix && finding.proposedFix && fixMode === null && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-violet-800 uppercase tracking-wider">
                  Proposed Fix
                </span>
                {finding.proposedFix.requiresEvidenceConfirmation && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Review required — edit before accepting
                  </span>
                )}
              </div>
              {finding.proposedFix.evidenceNote && (
                <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{finding.proposedFix.evidenceNote}</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 mb-3">
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Original</p>
                  <p className="text-xs text-gray-600 bg-white border border-gray-200 rounded p-2 line-clamp-3 font-mono">
                    {finding.proposedFix.original || '(blank)'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-violet-600 uppercase mb-1">Proposed</p>
                  <p className="text-xs text-gray-800 bg-white border border-violet-200 rounded p-2 line-clamp-5">
                    {finding.proposedFix.proposed}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!finding.proposedFix.requiresEvidenceConfirmation && (
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAcceptFix()}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    Accept
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={handleEditBeforeAccepting}
                  disabled={isPending}
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit before accepting
                </Button>
                <button
                  className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
                  onClick={() => setExpanded(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Edit mode */}
          {finding.canAutoFix && fixMode === 'edit' && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-bold text-violet-800 uppercase tracking-wider">
                Edit Proposed Fix
              </p>
              {finding.proposedFix?.evidenceNote && (
                <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{finding.proposedFix.evidenceNote}</span>
                </div>
              )}
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="text-sm min-h-[120px] font-mono text-xs"
                placeholder="Edit the proposed text here..."
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleAcceptFix(editedText)}
                  disabled={isPending || !editedText.trim()}
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                  Accept Edited Version
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setFixMode('preview')}
                  disabled={isPending}
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Show fix button when collapsed fix panel */}
          {finding.canAutoFix && fixMode === 'preview' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-violet-700 border-violet-300"
              onClick={() => setFixMode(null)}
            >
              Show Proposed Fix
            </Button>
          )}

          {/* Action row */}
          {isActionable && (
            <div className="flex items-center gap-2 pt-1 border-t border-black/10">
              {finding.canAutoFix && fixMode === null && (
                <span className="text-xs text-gray-400">or</span>
              )}
              <button
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                onClick={handleMarkResolved}
                disabled={isPending}
              >
                Mark resolved manually
              </button>
              <button
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline ml-auto"
                onClick={handleReject}
                disabled={isPending}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
