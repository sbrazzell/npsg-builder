import { Badge } from '@/components/ui/badge'
import { calculateRiskScore, getRiskLevel, getRiskBgClass } from '@/lib/scoring'
import { cn } from '@/lib/utils'

interface RiskBadgeProps {
  likelihood: number
  impact: number
  showScore?: boolean
  className?: string
}

export function RiskBadge({ likelihood, impact, showScore = true, className }: RiskBadgeProps) {
  const score = calculateRiskScore(likelihood, impact)
  const level = getRiskLevel(score)
  const bgClass = getRiskBgClass(level)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        bgClass,
        className
      )}
    >
      <span className="capitalize">{level}</span>
      {showScore && <span className="opacity-75">({score})</span>}
    </span>
  )
}
