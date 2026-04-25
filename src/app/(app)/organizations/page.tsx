export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Plus, Building2, ChevronRight } from 'lucide-react'
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'

export default async function OrganizationsPage() {
  const organizations = await prisma.organization.findMany({
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

  return (
    <div className="px-8 pb-16 max-w-[960px]">

      {/* Page header */}
      <div className="pt-9 pb-7 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-2.5">
            {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
          </p>
          <h1
            className="font-serif font-medium leading-[1.05]"
            style={{ fontSize: '38px', letterSpacing: '-0.025em', color: 'var(--ink)' }}
          >
            Organizations
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--ink-3)', maxWidth: '480px' }}>
            Each organization can have multiple sites. Grant applications are filed per site.
          </p>
        </div>
        <Link
          href="/organizations/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-sm text-[13px] font-medium flex-shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--nav-accent)', color: '#fff' }}
        >
          <Plus className="h-4 w-4" />
          Add Organization
        </Link>
      </div>

      {organizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="w-12 h-12 rounded-sm flex items-center justify-center mb-4"
            style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)' }}
          >
            <Building2 className="h-5 w-5" style={{ color: 'var(--ink-4)' }} />
          </div>
          <p className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>No organizations yet</p>
          <p className="text-[13px] mt-1 mb-4" style={{ color: 'var(--ink-3)' }}>
            Add your first nonprofit to start building a grant portfolio.
          </p>
          <Link
            href="/organizations/new"
            className="px-4 py-2 rounded-sm text-[13px] font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--nav-accent)', color: '#fff' }}
          >
            Add your first organization
          </Link>
        </div>
      ) : (
        <div
          className="rounded-sm overflow-hidden"
          style={{ border: '1px solid var(--rule)', background: 'white' }}
        >
          {organizations.map((org, idx) => {
            const siteCount = org.sites.length

            const totalBudget = org.sites.reduce((s, site) =>
              s + site.projectProposals.reduce((ps, p) =>
                ps + p.budgetItems.reduce((bs, b) => bs + b.totalCost, 0), 0), 0)

            const highRiskCount = org.sites.reduce((count, site) =>
              count + site.threatAssessments.filter(t => {
                const level = getRiskLevel(calculateRiskScore(t.likelihood, t.impact))
                return level === 'high' || level === 'critical'
              }).length, 0)

            const hasEin = !!org.einOrTaxId
            const hasContact = !!org.contactEmail

            return (
              <Link
                key={org.id}
                href={`/organizations/${org.id}`}
                className="flex items-start gap-5 px-6 py-5 group transition-colors hover:bg-[var(--paper-2)]"
                style={{ borderTop: idx > 0 ? '1px solid var(--rule)' : undefined }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--nav-accent)', color: '#fff' }}
                >
                  <Building2 className="h-4 w-4" />
                </div>

                {/* Name + meta + sites */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] leading-snug" style={{ color: 'var(--ink)' }}>
                    {org.name}
                  </p>
                  <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                    {org.denomination && (
                      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>{org.denomination}</span>
                    )}
                    {org.city && org.state && (
                      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>{org.city}, {org.state}</span>
                    )}
                    {!hasEin && (
                      <span
                        className="text-[10.5px] px-1.5 py-0.5 rounded-[2px]"
                        style={{ background: 'var(--warn-wash)', color: 'var(--warn)' }}
                      >
                        EIN missing
                      </span>
                    )}
                    {!hasContact && (
                      <span
                        className="text-[10.5px] px-1.5 py-0.5 rounded-[2px]"
                        style={{ background: 'var(--warn-wash)', color: 'var(--warn)' }}
                      >
                        No contact email
                      </span>
                    )}
                  </div>

                  {/* Site chips */}
                  {siteCount > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {org.sites.map(site => (
                        <span
                          key={site.id}
                          className="text-[11.5px] px-2 py-0.5 rounded-[2px]"
                          style={{
                            background: 'var(--paper-2)',
                            color: 'var(--ink-2)',
                            border: '1px solid var(--rule)',
                          }}
                        >
                          {site.siteName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] mt-2" style={{ color: 'var(--ink-4)' }}>No sites yet</p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8 flex-shrink-0 pt-0.5">
                  <div className="text-right">
                    <p
                      className="font-serif font-medium tabular-nums leading-none"
                      style={{ fontSize: '22px', letterSpacing: '-0.02em', color: 'var(--ink)' }}
                    >
                      {siteCount}
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
                      site{siteCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {highRiskCount > 0 && (
                    <div className="text-right">
                      <p
                        className="font-serif font-medium tabular-nums leading-none"
                        style={{ fontSize: '22px', letterSpacing: '-0.02em', color: 'var(--bad)' }}
                      >
                        {highRiskCount}
                      </p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
                        high risk
                      </p>
                    </div>
                  )}

                  {totalBudget > 0 && (
                    <div className="text-right">
                      <p
                        className="font-serif font-medium tabular-nums leading-none"
                        style={{ fontSize: '22px', letterSpacing: '-0.02em', color: 'var(--ink)' }}
                      >
                        {formatCurrency(totalBudget)}
                      </p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-4)' }}>requested</p>
                    </div>
                  )}

                  <ChevronRight
                    className="h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                    style={{ color: 'var(--ink-4)' }}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
