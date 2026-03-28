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
      return 'bg-green-100 text-green-800 border-green-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
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
