'use client'

import type { ReviewScores } from '@/lib/application-review/types'

const SCORE_ROWS: Array<{ key: keyof ReviewScores; label: string; weight: string }> = [
  { key: 'overall', label: 'Overall Readiness', weight: '' },
  { key: 'threat_evidence', label: 'Threat Evidence', weight: '18%' },
  { key: 'vulnerability_specificity', label: 'Vulnerability Specificity', weight: '15%' },
  { key: 'project_alignment', label: 'Project Alignment', weight: '22%' },
  { key: 'budget_quality', label: 'Budget Quality', weight: '20%' },
  { key: 'implementation_feasibility', label: 'Implementation Feasibility', weight: '12%' },
  { key: 'sustainment_quality', label: 'Sustainment Quality', weight: '8%' },
  { key: 'attachment_readiness', label: 'Attachment Readiness', weight: '5%' },
]

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-400'
  return 'bg-red-400'
}

function scoreTextColor(score: number): string {
  if (score >= 75) return 'text-emerald-700'
  if (score >= 50) return 'text-amber-700'
  return 'text-red-700'
}

interface ScoreDashboardProps {
  scores: ReviewScores
}

export function ScoreDashboard({ scores }: ScoreDashboardProps) {
  return (
    <div className="space-y-3">
      {SCORE_ROWS.map(({ key, label, weight }) => {
        const score = scores[key]
        const isOverall = key === 'overall'
        return (
          <div
            key={key}
            className={`${isOverall ? 'border-t pt-3 mt-1' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isOverall ? 'font-bold' : 'font-medium'} text-gray-700`}>
                  {label}
                </span>
                {weight && (
                  <span className="text-[10px] text-gray-400 font-mono">{weight}</span>
                )}
              </div>
              <span className={`text-sm font-bold tabular-nums ${scoreTextColor(score)}`}>
                {score}/100
              </span>
            </div>
            <div className={`w-full h-${isOverall ? '3' : '2'} bg-gray-100 rounded-full overflow-hidden`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${scoreColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
