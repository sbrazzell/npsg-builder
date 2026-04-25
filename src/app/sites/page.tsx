export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Plus, AlertTriangle, ChevronRight, Building2 } from 'lucide-react'
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'

// ─── Site photo thumbnail ──────────────────────────────────────────────────────

// Palette of warm/editorial accent colors for placeholders
const PLACEHOLDER_PALETTES = [
  { bg: '#dde4f0', text: '#1f2d5c' }, // navy wash
  { bg: '#e0ede0', text: '#2f5443' }, // sage
  { bg: '#f0e6dd', text: '#7a3d1a' }, // terracotta
  { bg: '#e8e0f0', text: '#4a2d6e' }, // plum
  { bg: '#f0ecdd', text: '#6b5a1a' }, // ochre
  { bg: '#ddeaed', text: '#1a4a52' }, // teal
]

function siteColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PLACEHOLDER_PALETTES[Math.abs(hash) % PLACEHOLDER_PALETTES.length]
}

function siteInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  // Use first letter of first two meaningful words (skip short words if possible)
  const meaningful = words.filter(w => w.length > 2)
  const pool = meaningful.length >= 2 ? meaningful : words
  return (pool[0][0] + pool[1][0]).toUpperCase()
}

function SitePhoto({ photoUrl, siteName }: { photoUrl?: string | null; siteName: string }) {
  const cls = "w-[160px] h-[105px] flex-shrink-0 overflow-hidden border"
  const style = { borderColor: 'var(--rule)' }

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <div className={cls} style={style}>
        <img src={photoUrl} alt={siteName} className="w-full h-full object-cover" />
      </div>
    )
  }

  const { bg, text } = siteColor(siteName)
  const initials = siteInitials(siteName)

  return (
    <div
      className={`${cls} flex flex-col items-center justify-center gap-2`}
      style={{ ...style, background: bg }}
    >
      <span
        className="font-serif font-semibold leading-none"
        style={{ fontSize: '28px', color: text, opacity: 0.7 }}
      >
        {initials}
      </span>
      <span className="text-[9.5px] font-medium tracking-wide uppercase" style={{ color: text, opacity: 0.4 }}>
        No photo
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SitesPage() {
  const orgs = await prisma.organization.findMany({
    include: {
      sites: {
        include: {
          threatAssessments: { select: { likelihood: true, impact: true } },
          projectProposals: { include: { budgetItems: { select: { totalCost: true } } } },
        },
        orderBy: { siteName: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  const totalSites = orgs.reduce((n, o) => n + o.sites.length, 0)

  return (
    <div className="px-8 pb-16 max-w-[960px]">

      {/* Page header */}
      <div className="pt-9 pb-7 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-2.5">All organizations · {totalSites} site{totalSites !== 1 ? 's' : ''}</p>
          <h1
            className="font-serif font-medium leading-[1.05]"
            style={{ fontSize: '38px', letterSpacing: '-0.025em', color: 'var(--ink)' }}
          >
            Sites
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--ink-3)', maxWidth: '480px' }}>
            Each site is a unique physical address applying for security grant funding. Click a site to manage its threats, projects, and narratives.
          </p>
        </div>
        <a
          href="/sites/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-sm text-[13px] font-medium flex-shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--nav-accent)', color: '#fff' }}
        >
          <Plus className="h-4 w-4" />
          Add Site
        </a>
      </div>

      {totalSites === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-sm flex items-center justify-center mb-4"
            style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)' }}>
            <Building2 className="h-5 w-5" style={{ color: 'var(--ink-4)' }} />
          </div>
          <p className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>No sites yet</p>
          <p className="text-[13px] mt-1 mb-4" style={{ color: 'var(--ink-3)' }}>
            Add at least one organization first, then add sites to it.
          </p>
          <a
            href="/sites/new"
            className="px-4 py-2 rounded-sm text-[13px] font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--nav-accent)', color: '#fff' }}
          >
            Add your first site
          </a>
        </div>
      ) : (
        <div className="space-y-8">
          {orgs.filter(o => o.sites.length > 0).map((org) => (
            <section key={org.id}>
              {/* Org header */}
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href={`/organizations/${org.id}`}
                  className="flex items-center gap-2 group"
                >
                  <div
                    className="w-6 h-6 rounded-[3px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--nav-accent)', color: '#fff' }}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className="font-serif font-semibold text-[16px] group-hover:underline"
                    style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
                  >
                    {org.name}
                  </span>
                </Link>
                <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-geist-mono)' }}>
                  {org.sites.length} site{org.sites.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--rule)' }} />
                <Link
                  href="/sites/new"
                  className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:text-[var(--ink)]"
                  style={{ color: 'var(--ink-4)' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add site
                </Link>
              </div>

              {/* Site cards */}
              <div
                className="rounded-sm overflow-hidden"
                style={{ border: '1px solid var(--rule)', background: 'white' }}
              >
                {org.sites.map((site, idx) => {
                  // Compute stats
                  const maxRiskScore = site.threatAssessments.reduce((max, t) => {
                    const s = calculateRiskScore(t.likelihood, t.impact)
                    return s > max ? s : max
                  }, 0)
                  const riskLevel = maxRiskScore > 0 ? getRiskLevel(maxRiskScore) : null
                  let totalBudget = 0
                  for (const p of site.projectProposals) {
                    for (const b of p.budgetItems) { totalBudget += b.totalCost }
                  }

                  const riskColors: Record<string, { bg: string; text: string }> = {
                    critical: { bg: 'var(--bad-wash)', text: 'var(--bad)' },
                    high:     { bg: '#fff0e6',          text: '#c2410c' },
                    medium:   { bg: 'var(--warn-wash)', text: '#92400e' },
                    low:      { bg: 'var(--ok-wash)',   text: 'var(--ok)' },
                  }
                  const risk = riskLevel ? riskColors[riskLevel] : null

                  return (
                    <div
                      key={site.id}
                      className="flex gap-0 transition-colors hover:bg-[var(--paper-2)] group relative"
                      style={{
                        borderTop: idx > 0 ? '1px solid var(--rule)' : undefined,
                      }}
                    >
                      {/* Site photo thumbnail */}
                      <div className="flex-shrink-0" style={{ borderRight: '1px solid var(--rule)' }}>
                        <SitePhoto photoUrl={site.sitePhotoUrl} siteName={site.siteName} />
                      </div>

                      {/* Clickable overlay for the site detail link */}
                      <Link
                        href={`/sites/${site.id}`}
                        className="absolute inset-0"
                        aria-label={`Open ${site.siteName}`}
                      />

                      {/* Site info */}
                      <div className="flex-1 min-w-0 px-5 py-4 flex flex-col justify-between relative pointer-events-none">
                        <div>
                          <div className="flex items-start gap-3">
                            <p
                              className="font-semibold text-[14.5px] leading-[1.3]"
                              style={{ color: 'var(--ink)' }}
                            >
                              {site.siteName}
                            </p>
                            {riskLevel && risk && (
                              <span
                                className="flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium uppercase tracking-wide"
                                style={{ background: risk.bg, color: risk.text }}
                              >
                                {riskLevel} risk
                              </span>
                            )}
                          </div>
                          {site.address && (
                            <p className="text-[12.5px] mt-1 leading-snug" style={{ color: 'var(--ink-3)' }}>
                              {site.address}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-3">
                          <StatPill
                            value={site.threatAssessments.length}
                            label="threat"
                            icon={<AlertTriangle className="h-3 w-3" />}
                            empty={site.threatAssessments.length === 0}
                          />
                          <StatPill
                            value={site.projectProposals.length}
                            label="project"
                            empty={site.projectProposals.length === 0}
                          />
                          {totalBudget > 0 && (
                            <span className="text-[12px] tabular-nums font-medium" style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-geist-mono)' }}>
                              {formatCurrency(totalBudget)}
                            </span>
                          )}
                          <span
                            className="ml-auto text-[11px] px-2 py-0.5 rounded-[3px]"
                            style={{ background: 'var(--paper-2)', color: 'var(--ink-4)', border: '1px solid var(--rule)' }}
                          >
                            FY{site.targetCycleYear ?? 2026}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center px-4 relative pointer-events-none" style={{ color: 'var(--ink-4)' }}>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          {/* Orgs with no sites — show as collapsed callout */}
          {orgs.filter(o => o.sites.length === 0).map(org => (
            <div
              key={org.id}
              className="flex items-center gap-3 px-4 py-3 rounded-sm"
              style={{ border: '1px dashed var(--rule)', background: 'var(--paper-2)' }}
            >
              <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ink-4)' }} />
              <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
                <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{org.name}</span>
                {' '}— no sites yet
              </span>
              <Link
                href="/sites/new"
                className="ml-auto text-[12px] font-medium transition-colors hover:text-[var(--ink)]"
                style={{ color: 'var(--nav-accent)' }}
              >
                Add site →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatPill({
  value, label, icon, empty,
}: {
  value: number; label: string; icon?: React.ReactNode; empty?: boolean
}) {
  return (
    <span
      className="flex items-center gap-1.5 text-[12px]"
      style={{ color: empty ? 'var(--ink-4)' : 'var(--ink-3)' }}
    >
      {icon}
      <span className="tabular-nums font-medium" style={{ fontFamily: 'var(--font-geist-mono)' }}>
        {value}
      </span>
      <span>{label}{value !== 1 ? 's' : ''}</span>
    </span>
  )
}
