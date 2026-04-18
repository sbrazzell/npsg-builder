import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import { calculateRiskScore, getRiskLevel } from '@/lib/scoring'
import { AlertTriangle, BadgeCheck, Pencil, Plus } from 'lucide-react'
import { ThreatActions } from './threat-actions'
import { THREAT_SOURCES } from '@/lib/validations'

// ─── helpers ────────────────────────────────────────────────────────────────

function cellLevel(likelihood: number, impact: number): string {
  const score = likelihood * impact
  if (score <= 4)  return 'tmx-l1'
  if (score <= 6)  return 'tmx-l2'
  if (score <= 9)  return 'tmx-l3'
  if (score <= 16) return 'tmx-l4'
  return 'tmx-l5'
}

function dotClass(level: string): string {
  switch (level) {
    case 'critical': return 'crit'
    case 'high':     return 'high'
    case 'medium':   return 'med'
    case 'low':      return 'low'
    default:         return 'min'
  }
}

const DOT_COLORS: Record<string, string> = {
  crit: 'var(--risk-critical)',
  high: 'var(--risk-high)',
  med:  'var(--risk-med)',
  low:  'var(--risk-low)',
  min:  'var(--risk-min)',
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function ThreatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.site.findUnique({
    where: { id },
    include: {
      organization: true,
      threatAssessments: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!facility) notFound()

  const sorted = [...facility.threatAssessments].sort(
    (a, b) => calculateRiskScore(b.likelihood, b.impact) - calculateRiskScore(a.likelihood, a.impact)
  )

  // Group threats by cell for positioning
  const cellGroups: Record<string, typeof sorted> = {}
  for (const t of sorted) {
    const key = `${t.likelihood}-${t.impact}`
    if (!cellGroups[key]) cellGroups[key] = []
    cellGroups[key].push(t)
  }

  // Build dot positions — center each dot in its cell, cluster multiples
  type DotInfo = {
    threat: (typeof sorted)[0]
    idx: number           // index in sorted list (1-based label)
    level: string         // 'crit'|'high'|'med'|'low'|'min'
    topPct: number
    leftPct: number
  }

  const dots: DotInfo[] = []
  let sortedIdx = 0
  for (const t of sorted) {
    sortedIdx++
    const key = `${t.likelihood}-${t.impact}`
    const group = cellGroups[key]
    const posInGroup = group.indexOf(t)
    const groupSize = group.length

    // Cell center (each cell is 20% of the grid)
    const baseCx = (t.likelihood - 1) * 20 + 10  // % from left
    const baseCy = (5 - t.impact) * 20 + 10       // % from top

    // Offset within cell for multiple threats
    let ox = 0, oy = 0
    if (groupSize === 2) {
      ox = posInGroup === 0 ? -5 : 5
    } else if (groupSize === 3) {
      const offsets = [[-5, -5], [5, -5], [0, 5]]
      ;[ox, oy] = offsets[posInGroup] ?? [0, 0]
    } else if (groupSize > 3) {
      ox = (posInGroup % 2 === 0 ? -5 : 5)
      oy = Math.floor(posInGroup / 2) * 8 - 4
    }

    const riskLevel = getRiskLevel(calculateRiskScore(t.likelihood, t.impact))
    dots.push({
      threat: t,
      idx: sortedIdx,
      level: dotClass(riskLevel),
      topPct: baseCy + oy,
      leftPct: baseCx + ox,
    })
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Sites', href: '/sites' },
        { label: facility.siteName, href: `/sites/${id}` },
        { label: 'Threat Assessments' },
      ]} />
      <div className="px-8 pb-16">

        {/* Page header */}
        <div className="pt-8 pb-6 flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Threat analysis · {facility.siteName}</p>
            <h1 className="font-serif font-medium"
              style={{ fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Threat Assessments
            </h1>
            <p className="mt-1.5 text-[13.5px]" style={{ color: 'var(--ink-3)' }}>
              {sorted.length} {sorted.length === 1 ? 'threat' : 'threats'} documented ·{' '}
              {sorted.filter(t => ['high','critical'].includes(getRiskLevel(calculateRiskScore(t.likelihood, t.impact)))).length} high or critical
            </p>
          </div>
          <Link
            href={`/sites/${id}/threats/new`}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-sm text-[13px] font-medium mt-0.5"
            style={{ background: 'var(--nav-accent)', color: '#fff', border: '1px solid var(--nav-accent)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Threat
          </Link>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No threats documented yet"
            description="Document threats to build the risk analysis section of your grant application."
            actionLabel="Add First Threat"
            actionHref={`/sites/${id}/threats/new`}
          />
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 320px' }}>

            {/* ── 5×5 Heatmap ─────────────────────────────────────── */}
            <div className="bg-white rounded-sm border px-7 py-6" style={{ borderColor: 'var(--rule)' }}>
              <div className="flex items-baseline justify-between mb-5">
                <p className="font-serif font-semibold text-[17px]" style={{ letterSpacing: '-0.01em' }}>
                  Risk Matrix
                </p>
                <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                  Likelihood × Impact
                </p>
              </div>

              {/* Grid with Y label + numbers */}
              <div className="grid gap-2" style={{ gridTemplateColumns: '28px 1fr' }}>
                {/* Y-axis label */}
                <div className="flex items-center justify-center">
                  <span
                    className="font-mono-label"
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      fontSize: '10.5px',
                      color: 'var(--ink-3)',
                    }}
                  >
                    Impact
                  </span>
                </div>

                <div className="grid gap-1" style={{ gridTemplateColumns: '28px 1fr' }}>
                  {/* Y numbers */}
                  <div className="grid" style={{ gridTemplateRows: 'repeat(5, 1fr)', paddingBottom: '28px' }}>
                    {[5,4,3,2,1].map(n => (
                      <div
                        key={n}
                        className="flex items-center justify-end pr-1.5 text-[10.5px]"
                        style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}
                      >
                        {n}
                      </div>
                    ))}
                  </div>

                  {/* The matrix itself */}
                  <div>
                    {/* Cells + dots */}
                    <div
                      className="relative"
                      style={{ aspectRatio: '1/1' }}
                    >
                      {/* 5×5 cell grid */}
                      <div
                        className="absolute inset-0 grid"
                        style={{
                          gridTemplateRows: 'repeat(5, 1fr)',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          gap: '2px',
                        }}
                      >
                        {[5,4,3,2,1].map(impact =>
                          [1,2,3,4,5].map(likelihood => {
                            const cls = cellLevel(likelihood, impact)
                            const score = likelihood * impact
                            return (
                              <div
                                key={`${likelihood}-${impact}`}
                                className={`relative border ${cls}`}
                                style={{ borderRadius: '1px' }}
                              >
                                <span
                                  className="absolute top-[3px] right-[5px] text-[9px] opacity-40"
                                  style={{ fontFamily: 'var(--font-geist-mono)' }}
                                >
                                  {score}
                                </span>
                              </div>
                            )
                          })
                        )}
                      </div>

                      {/* Threat dots — absolutely positioned over the grid */}
                      {dots.map(dot => (
                        <div
                          key={dot.threat.id}
                          title={`${dot.threat.threatType} (L${dot.threat.likelihood}×I${dot.threat.impact})`}
                          className="absolute flex items-center justify-center rounded-full font-serif font-semibold text-white border-2 border-white shadow-sm transition-transform hover:scale-110 hover:z-10"
                          style={{
                            width: '28px',
                            height: '28px',
                            fontSize: '12px',
                            top: `calc(${dot.topPct}% - 14px)`,
                            left: `calc(${dot.leftPct}% - 14px)`,
                            background: DOT_COLORS[dot.level],
                            cursor: 'default',
                            zIndex: 2,
                          }}
                        >
                          {dot.idx}
                        </div>
                      ))}
                    </div>

                    {/* X-axis numbers */}
                    <div
                      className="grid mt-1.5"
                      style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
                    >
                      {[1,2,3,4,5].map(n => (
                        <div
                          key={n}
                          className="text-center text-[10.5px]"
                          style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                    {/* X-axis label */}
                    <p
                      className="text-center mt-1 font-mono-label"
                      style={{ fontSize: '10.5px', color: 'var(--ink-3)' }}
                    >
                      Likelihood
                    </p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-3.5 flex-wrap mt-4 pt-3.5" style={{ borderTop: '1px solid var(--rule-2)' }}>
                {[
                  { label: 'Low (1–4)',       cls: 'tmx-l1' },
                  { label: 'Moderate (5–6)',  cls: 'tmx-l2' },
                  { label: 'Medium (7–9)',    cls: 'tmx-l3' },
                  { label: 'High (10–16)',    cls: 'tmx-l4' },
                  { label: 'Critical (17+)', cls: 'tmx-l5' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    <div className={`w-3 h-3 rounded-[1px] border ${item.cls}`} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Threat list ──────────────────────────────────────── */}
            <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
              <div className="px-4 py-3.5 border-b flex items-center justify-between"
                style={{ background: 'var(--paper-2)', borderColor: 'var(--rule)' }}>
                <p className="font-serif font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>
                  Threats
                </p>
                <span
                  className="text-[11px] tabular-nums"
                  style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}
                >
                  {sorted.length} total
                </span>
              </div>

              <div className="divide-y" style={{ '--tw-divide-opacity': '1' } as React.CSSProperties}>
                {dots.map(dot => {
                  const t = dot.threat
                  const source = THREAT_SOURCES.find(s => s.value === t.source)
                  return (
                    <div
                      key={t.id}
                      className="px-4 py-3 grid gap-2.5 items-center hover:bg-[var(--paper-2)] transition-colors"
                      style={{
                        gridTemplateColumns: '26px 1fr auto',
                        borderColor: 'var(--rule-2)',
                      }}
                    >
                      {/* Number badge */}
                      <div
                        className="w-[24px] h-[24px] rounded-full flex items-center justify-center font-serif font-semibold text-white flex-shrink-0"
                        style={{ fontSize: '11.5px', background: DOT_COLORS[dot.level] }}
                      >
                        {dot.idx}
                      </div>

                      {/* Content */}
                      <div className="min-w-0">
                        <p className="font-medium text-[13px] truncate" style={{ color: 'var(--ink)' }}>
                          {t.threatType}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[10.5px] tabular-nums"
                            style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}
                          >
                            L{t.likelihood}×I{t.impact} = {calculateRiskScore(t.likelihood, t.impact)}
                          </span>
                          {t.source && t.source !== 'self_assessed' && (
                            <span className="text-[10.5px] flex items-center gap-0.5" style={{ color: 'var(--nav-accent)' }}>
                              {t.source === 'law_enforcement' && <BadgeCheck className="h-3 w-3" />}
                              {source?.label ?? t.source}
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-[11.5px] mt-0.5 line-clamp-2" style={{ color: 'var(--ink-3)' }}>
                            {t.description}
                          </p>
                        )}
                      </div>

                      {/* Edit action */}
                      <ThreatActions threatId={t.id} siteId={id} />
                    </div>
                  )
                })}
              </div>

              <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--rule-2)' }}>
                <Link
                  href={`/sites/${id}/threats/new`}
                  className="flex items-center gap-1.5 text-[12.5px] font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--nav-accent)' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another threat
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
