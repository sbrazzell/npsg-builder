'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AnalysisPoint {
  id: string
  overallScore: number
  riskClarityScore: number
  vulnerabilitySpecificityScore: number
  projectAlignmentScore: number
  budgetDefensibilityScore: number
  narrativeQualityScore: number
  createdAt: Date
}

interface Props {
  history: AnalysisPoint[]
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ScoreHistoryChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        Run the analyzer again after making improvements to see your progress over time.
      </p>
    )
  }

  // Reverse so oldest is on the left
  const data = [...history].reverse().map((point) => ({
    date: formatDate(point.createdAt),
    'Overall Score': point.overallScore,
    'Risk Clarity': point.riskClarityScore * 5,
    'Vulnerability': point.vulnerabilitySpecificityScore * 5,
    'Project Alignment': point.projectAlignmentScore * 5,
    'Budget': point.budgetDefensibilityScore * 5,
    'Narrative': point.narrativeQualityScore * 5,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#475569', fontWeight: 600 }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
          iconType="circle"
          iconSize={8}
        />
        {/* Primary: Overall Score */}
        <Line
          type="monotone"
          dataKey="Overall Score"
          stroke="#4f46e5"
          strokeWidth={2.5}
          dot={{ fill: '#4f46e5', r: 4 }}
          activeDot={{ r: 5 }}
        />
        {/* Dimension lines — thinner, scaled 0-100 (each dimension is 0-20, multiplied by 5) */}
        <Line type="monotone" dataKey="Risk Clarity" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="Vulnerability" stroke="#f97316" strokeWidth={1} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="Project Alignment" stroke="#6366f1" strokeWidth={1} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="Budget" stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="Narrative" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  )
}
