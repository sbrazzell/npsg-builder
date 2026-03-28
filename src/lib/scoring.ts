export function calculateRiskScore(likelihood: number, impact: number): number {
  return likelihood * impact
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 4) return 'low'
  if (score <= 9) return 'medium'
  if (score <= 16) return 'high'
  return 'critical'
}

export function getRiskColor(level: RiskLevel | string): string {
  switch (level) {
    case 'low':
      return '#22c55e'
    case 'medium':
      return '#f59e0b'
    case 'high':
      return '#f97316'
    case 'critical':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

export function getRiskBgClass(level: RiskLevel | string): string {
  switch (level) {
    case 'low':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'medium':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'high':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'critical':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
