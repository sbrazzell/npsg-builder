export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Plus, AlertTriangle, ChevronRight, Building2 } from 'lucide-react'
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'

// ─── Map thumbnail ────────────────────────────────────────────────────────────

function SiteMap({ address }: { address?: string | null }) {
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null

  const thumbnail = (
    <svg
      viewBox="0 0 160 105"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden
    >
      {/* Base */}
      <rect width="160" height="105" fill="#ede9df" />

      {/* Green park patches */}
      <rect x="6" y="6" width="38" height="28" rx="2" fill="#d4e8c2" />
      <rect x="110" y="72" width="44" height="27" rx="2" fill="#d4e8c2" />
      <rect x="6" y="72" width="28" height="18" rx="2" fill="#d8ebc8" />

      {/* City blocks */}
      <rect x="6" y="40" width="44" height="26" rx="2" fill="#ddd8cc" />
      <rect x="58" y="6" width="38" height="30" rx="2" fill="#ddd8cc" />
      <rect x="104" y="6" width="50" height="28" rx="2" fill="#ddd8cc" />
      <rect x="58" y="42" width="44" height="26" rx="2" fill="#ddd8cc" />
      <rect x="110" y="42" width="44" height="24" rx="2" fill="#d9d4c8" />
      <rect x="40" y="72" width="62" height="27" rx="2" fill="#ddd8cc" />

      {/* Roads — horizontal */}
      <rect x="0" y="36" width="160" height="6" fill="#f5f2ec" />
      <rect x="0" y="68" width="160" height="6" fill="#f5f2ec" />
      {/* Roads — vertical */}
      <rect x="52" y="0" width="6" height="105" fill="#f5f2ec" />
      <rect x="106" y="0" width="6" height="105" fill="#f5f2ec" />

      {/* Road centre lines */}
      <line x1="0" y1="39" x2="52" y2="39" stroke="#e8e0d2" strokeWidth="0.75" strokeDasharray="6 4" />
      <line x1="58" y1="39" x2="106" y2="39" stroke="#e8e0d2" strokeWidth="0.75" strokeDasharray="6 4" />
      <line x1="112" y1="39" x2="160" y2="39" stroke="#e8e0d2" strokeWidth="0.75" strokeDasharray="6 4" />

      {/* Water feature */}
      <ellipse cx="134" cy="30" rx="9" ry="5" fill="#b8d8f0" opacity="0.7" />

      {/* Pin */}
      <circle cx="80" cy="50" r="11" fill="#1f2d5c" />
      <circle cx="80" cy="50" r="5.5" fill="white" />
      <circle cx="80" cy="64" r="3" fill="#1f2d5c" opacity="0.3" />
    </svg>
  )

  if (!mapsUrl) {
    return (
      <div className="w-[160px] h-[105px] flex-shrink-0 rounded-sm overflow-hidden border"
        style={{ borderColor: 'var(--rule)' }}>
        {thumbnail}
      </div>
    )
  }

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="w-[160px] h-[105px] flex-shrink-0 rounded-sm overflow-hidden border block hover:opacity-90 transition-opacity"
      style={{ borderColor: 'var(--rule)' }}
      title={`Open ${address} in Google Maps`}
    >
      {thumbnail}
    </a>
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
                      {/* Map thumbnail — sits outside the main Link so we can open Google Maps separately */}
                      <div className="w-[160px] h-[105px] flex-shrink-0 overflow-hidden"
                        style={{ borderRight: '1px solid var(--rule)' }}>
                        <SiteMap address={site.address} />
                      </div>

                      {/* Clickable overlay for the site detail link */}
                      <Link
                        href={`/sites/${site.id}`}
                        className="absolute inset-0"
                        style={{ left: 160 }}
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
