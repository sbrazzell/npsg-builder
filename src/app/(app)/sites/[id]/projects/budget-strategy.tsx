import { formatCurrency } from '@/lib/scoring'

const GRANT_CEILING = 200_000

const LAYER_CATEGORIES = ['Access Control', 'Surveillance', 'Lighting', 'Physical Hardening', 'Communication'] as const

const LAYER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Access Control':    { bg: '#e9ecf5', text: '#1f2d5c', border: '#c5cde8' },
  'Surveillance':      { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  'Lighting':          { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  'Physical Hardening':{ bg: '#fef2f2', text: '#7f1d1d', border: '#fecaca' },
  'Communication':     { bg: '#f5f3ff', text: '#4c1d95', border: '#ddd6fe' },
}

type Project = {
  category: string | null
  budget: number
  includedInFiling: boolean
  status: string
}

export function BudgetStrategyPanel({ projects }: { projects: Project[] }) {
  const selected = projects.filter((p) => p.includedInFiling && p.status === 'selected')
  if (selected.length === 0) return null

  const totalBudget = selected.reduce((s, p) => s + p.budget, 0)
  const pct = Math.min(100, Math.round((totalBudget / GRANT_CEILING) * 100))
  const remaining = GRANT_CEILING - totalBudget

  // Which NSGP security layers are covered
  const coveredCategories = new Set(
    selected.map((p) => p.category).filter((c): c is string => !!c)
  )

  // Budget by category
  const byCategory: Record<string, number> = {}
  for (const p of selected) {
    if (p.category) byCategory[p.category] = (byCategory[p.category] ?? 0) + p.budget
  }

  const barColor =
    pct >= 90 ? 'var(--ok)' : pct >= 70 ? 'var(--nav-accent)' : 'var(--warn)'

  return (
    <div
      className="rounded-sm border p-4 space-y-4"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper-2)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
          Grant Budget Strategy
        </p>
        <span className="text-[12px]" style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-geist-mono)' }}>
          {selected.length} selected project{selected.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[12px]">
          <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-geist-mono)' }}>
            {formatCurrency(totalBudget)}
          </span>
          <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-geist-mono)' }}>
            {formatCurrency(GRANT_CEILING)} ceiling
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <div className="flex items-center justify-between text-[11.5px]">
          <span style={{ color: 'var(--ink-3)' }}>{pct}% of ceiling</span>
          {remaining > 0 ? (
            <span style={{ color: 'var(--ink-4)' }}>
              {formatCurrency(remaining)} remaining capacity
            </span>
          ) : (
            <span style={{ color: 'var(--bad)' }}>At or over ceiling — review budgets</span>
          )}
        </div>
      </div>

      {/* Security layer coverage */}
      <div>
        <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--ink-4)' }}>
          Layered security coverage
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LAYER_CATEGORIES.map((cat) => {
            const covered = coveredCategories.has(cat)
            const style = LAYER_COLORS[cat]
            return (
              <span
                key={cat}
                className="text-[11px] px-2 py-0.5 rounded-sm border"
                style={
                  covered
                    ? { background: style.bg, color: style.text, borderColor: style.border }
                    : { background: 'transparent', color: 'var(--ink-4)', borderColor: 'var(--rule)', textDecoration: 'line-through' }
                }
              >
                {cat}
                {covered && byCategory[cat] ? ` · ${formatCurrency(byCategory[cat])}` : ''}
              </span>
            )
          })}
        </div>
        {coveredCategories.size < 2 && (
          <p className="text-[11.5px] mt-2" style={{ color: 'var(--warn)' }}>
            NSGP reviewers look for a layered approach — consider adding projects from uncovered categories.
          </p>
        )}
      </div>
    </div>
  )
}
