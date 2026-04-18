export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'
import { ArrowRight, Plus } from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────────────────────

function pct(n: number, d: number) {
  if (d === 0) return 0
  return Math.min(100, Math.round((n / d) * 100))
}

function barColor(p: number) {
  if (p >= 80) return 'var(--ok)'
  if (p >= 55) return 'var(--warn)'
  return 'var(--bad)'
}

function riskClass(level: string) {
  switch (level) {
    case 'critical': return 'risk-critical'
    case 'high':     return 'risk-high'
    case 'medium':   return 'risk-med'
    case 'low':      return 'risk-low'
    default:         return 'risk-min'
  }
}

function riskLabel(level: string) {
  switch (level) {
    case 'critical': return 'CRIT'
    case 'high':     return 'HIGH'
    case 'medium':   return 'MED'
    case 'low':      return 'LOW'
    default:         return 'MIN'
  }
}

// ─── data fetching ───────────────────────────────────────────────────────────

async function getDashboardData() {
  const [orgs, facilities, allThreats, allProjects, , , allBudgetItems] =
    await Promise.all([
      prisma.organization.findMany({
        select: { id: true, name: true, einOrTaxId: true, contactName: true, address: true },
      }),
      prisma.site.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          organization: { select: { name: true } },
          threatAssessments: { select: { id: true, likelihood: true, impact: true } },
          securityMeasures: { select: { id: true } },
          projectProposals: {
            include: {
              budgetItems: { select: { id: true, totalCost: true, justification: true } },
              threatLinks: { select: { id: true } },
            },
          },
          narrativeDrafts: { select: { id: true } },
        },
      }),
      prisma.threatAssessment.findMany({ select: { likelihood: true, impact: true } }),
      prisma.projectProposal.findMany({ select: { status: true } }),
      prisma.existingSecurityMeasure.findMany({ select: { id: true } }),
      prisma.narrativeDraft.findMany({ select: { id: true } }),
      prisma.budgetItem.findMany({ select: { totalCost: true, justification: true } }),
    ])

  const siteCount = facilities.length
  const orgCount = orgs.length

  // High/critical threat count
  const highRiskThreats = allThreats.filter(t => {
    const score = calculateRiskScore(t.likelihood, t.impact)
    const level = getRiskLevel(score)
    return level === 'high' || level === 'critical'
  }).length

  // Active proposals
  const activeProposals = allProjects.filter(p => p.status !== 'submitted').length
  const submittedProposals = allProjects.filter(p => p.status === 'submitted').length

  // Total budget
  const totalBudget = allBudgetItems.reduce((s, b) => s + b.totalCost, 0)

  // ── Readiness bars ──
  // 1. Org profiles: orgs with EIN + contact name
  const orgsWithProfile = orgs.filter(o => o.einOrTaxId && o.contactName).length
  const orgProfilePct = pct(orgsWithProfile, Math.max(1, orgCount))

  // 2. Threat assessments: facilities with ≥1 threat
  const facilitiesWithThreats = facilities.filter(f => f.threatAssessments.length > 0).length
  const threatPct = pct(facilitiesWithThreats, Math.max(1, siteCount))

  // 3. Security measures: facilities with ≥1 measure
  const facilitiesWithMeasures = facilities.filter(f => f.securityMeasures.length > 0).length
  const measurePct = pct(facilitiesWithMeasures, Math.max(1, siteCount))

  // 4. Project proposals: facilities with ≥1 proposal
  const facilitiesWithProposals = facilities.filter(f => f.projectProposals.length > 0).length
  const proposalPct = pct(facilitiesWithProposals, Math.max(1, siteCount))

  // 5. Budgets: proposals with ≥1 budget item
  const projectsWithBudgets = facilities
    .flatMap(f => f.projectProposals)
    .filter(p => p.budgetItems.length > 0).length
  const allProposalCount = facilities.flatMap(f => f.projectProposals).length
  const budgetPct = pct(projectsWithBudgets, Math.max(1, allProposalCount))

  // 6. Narratives: facilities with ≥1 narrative draft
  const facilitiesWithNarratives = facilities.filter(f => f.narrativeDrafts.length > 0).length
  const narrativePct = pct(facilitiesWithNarratives, Math.max(1, siteCount))

  // Overall portfolio readiness (weighted average)
  const overallPct = Math.round(
    (orgProfilePct * 0.15 + threatPct * 0.20 + measurePct * 0.15 +
     proposalPct * 0.20 + budgetPct * 0.15 + narrativePct * 0.15)
  )

  function readinessLevel(p: number) {
    if (p >= 85) return 'Submission-ready'
    if (p >= 70) return 'Good — approaching submission grade'
    if (p >= 50) return 'In progress — key gaps remain'
    return 'Early stage — significant work ahead'
  }

  // ── Blockers ──
  type Blocker = { severity: 'bad' | 'warn'; text: string; href: string; cta: string }
  const blockers: Blocker[] = []

  // Facilities missing threats
  const missingThreats = facilities.filter(f => f.threatAssessments.length === 0)
  if (missingThreats.length > 0) {
    blockers.push({
      severity: 'bad',
      text: `${missingThreats.length} ${missingThreats.length === 1 ? 'site has' : 'sites have'} no threat assessments documented.`,
      href: '/sites',
      cta: 'Fix →',
    })
  }

  // Projects without threat linkage
  const projectsWithoutLinks = facilities
    .flatMap(f => f.projectProposals)
    .filter(p => p.threatLinks.length === 0)
  if (projectsWithoutLinks.length > 0) {
    blockers.push({
      severity: 'bad',
      text: `${projectsWithoutLinks.length} ${projectsWithoutLinks.length === 1 ? 'project is' : 'projects are'} missing threat linkage. Reviewers flag unlinked projects.`,
      href: '/sites',
      cta: 'Fix →',
    })
  }

  // Orgs missing EIN
  const orgsNoEin = orgs.filter(o => !o.einOrTaxId)
  if (orgsNoEin.length > 0) {
    blockers.push({
      severity: 'bad',
      text: `${orgsNoEin.map(o => o.name).join(', ')} — EIN not on file.`,
      href: '/organizations',
      cta: 'Fix →',
    })
  }

  // Budget items missing justification
  const unjustifiedBudget = allBudgetItems.filter(b => !b.justification && b.totalCost > 0)
  const unjustifiedTotal = unjustifiedBudget.reduce((s, b) => s + b.totalCost, 0)
  if (unjustifiedTotal > 0) {
    blockers.push({
      severity: 'warn',
      text: `${formatCurrency(unjustifiedTotal)} of budget items are missing justification text.`,
      href: '/sites',
      cta: 'Review →',
    })
  }

  // No narratives
  const narrativesNeeded = siteCount - facilitiesWithNarratives
  if (narrativesNeeded > 0) {
    blockers.push({
      severity: 'warn',
      text: `${narrativesNeeded} ${narrativesNeeded === 1 ? 'site has' : 'sites have'} no narrative drafts generated.`,
      href: '/sites',
      cta: 'Draft →',
    })
  }

  // ── Per-site roster ──
  const roster = facilities.map(f => {
    const scores = f.threatAssessments.map(t => calculateRiskScore(t.likelihood, t.impact))
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0
    const topLevel = scores.length > 0 ? getRiskLevel(maxScore) : 'minimal'
    const criticalCount = f.threatAssessments.filter(t => {
      const level = getRiskLevel(calculateRiskScore(t.likelihood, t.impact))
      return level === 'critical'
    }).length
    const siteBudget = f.projectProposals.flatMap(p => p.budgetItems).reduce((s, b) => s + b.totalCost, 0)

    // Per-site readiness
    const orgForSite = orgs.find(o => o.id === f.organizationId)
    const fOrgPct = (orgForSite?.einOrTaxId && orgForSite?.contactName) ? 100 : 50
    const fThreatPct = f.threatAssessments.length > 0 ? 100 : 0
    const fMeasurePct = f.securityMeasures.length > 0 ? 100 : 0
    const fProposalPct = f.projectProposals.length > 0 ? 100 : 0
    const fBudgetPct = f.projectProposals.length > 0
      ? pct(f.projectProposals.filter(p => p.budgetItems.length > 0).length, f.projectProposals.length)
      : 0
    const fNarrativePct = f.narrativeDrafts.length > 0 ? 100 : 0
    const fReadiness = Math.round(
      (fOrgPct * 0.05 + fThreatPct * 0.25 + fMeasurePct * 0.20 + fProposalPct * 0.25 + fBudgetPct * 0.15 + fNarrativePct * 0.10)
    )

    // Blockers for this site
    const fBlockers: string[] = []
    if (f.threatAssessments.length === 0) fBlockers.push('No threats')
    if (f.projectProposals.some(p => p.threatLinks.length === 0)) fBlockers.push('Unlinked project')
    if (f.projectProposals.length === 0) fBlockers.push('No proposals')

    return {
      id: f.id,
      name: f.siteName,
      org: f.organization.name,
      maxScore,
      topLevel,
      criticalCount,
      threatCount: f.threatAssessments.length,
      budget: siteBudget,
      projectCount: f.projectProposals.length,
      readiness: fReadiness,
      blockers: fBlockers,
    }
  })

  // Sort by readiness ascending (worst first)
  roster.sort((a, b) => a.readiness - b.readiness)

  return {
    orgCount,
    siteCount,
    highRiskThreats,
    activeProposals,
    submittedProposals,
    totalBudget,
    overallPct,
    readinessLevel: readinessLevel(overallPct),
    readinessBars: [
      { name: 'Organization profiles', pct: orgProfilePct },
      { name: 'Threat assessments',    pct: threatPct },
      { name: 'Security measures',     pct: measurePct },
      { name: 'Project proposals',     pct: proposalPct },
      { name: 'Budgets & justifications', pct: budgetPct },
      { name: 'Narratives',            pct: narrativePct },
    ],
    blockers,
    roster,
  }
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const data = await getDashboardData()
  const {
    orgCount, siteCount, highRiskThreats, activeProposals,
    submittedProposals, totalBudget, overallPct, readinessLevel,
    readinessBars, blockers, roster,
  } = data

  return (
    <div className="px-12 pb-16 max-w-[1240px]">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="pt-9 pb-7">
        <p className="eyebrow mb-2.5">FY2026 Application Cycle · Portfolio overview</p>
        <div className="flex items-end justify-between gap-8">
          <div>
            <h1 className="font-serif font-medium leading-[1.05]"
              style={{ fontSize: '40px', letterSpacing: '-0.025em', color: 'var(--ink)' }}>
              Grant Portfolio
            </h1>
            <p className="mt-2.5 text-[14.5px]" style={{ color: 'var(--ink-3)', maxWidth: '580px' }}>
              {siteCount} {siteCount === 1 ? 'site' : 'sites'} in the portfolio
              {' · '}{submittedProposals > 0 ? `${submittedProposals} submitted` : 'none submitted yet'}
              {blockers.filter(b => b.severity === 'bad').length > 0
                ? ` · ${blockers.filter(b => b.severity === 'bad').length} outstanding blockers`
                : ' · no critical blockers'}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href="/sites/new"
              className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-sm text-[13px] font-medium border transition-colors duration-150"
              style={{ border: '1px solid var(--rule)', background: 'white', color: 'var(--ink)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              New site
            </Link>
            <Link
              href="/readiness"
              className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-sm text-[13px] font-medium transition-colors duration-150"
              style={{ background: 'var(--nav-accent)', color: '#fff', border: '1px solid var(--nav-accent)' }}
            >
              Review readiness
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Readiness hero ──────────────────────────────────────────── */}
      <div
        className="grid overflow-hidden rounded-sm"
        style={{
          gridTemplateColumns: '1fr 360px',
          gap: '1px',
          background: 'var(--rule)',
          border: '1px solid var(--rule)',
        }}
      >
        {/* Left: overall % + section bars */}
        <div className="bg-white px-9 py-8">
          <p className="font-mono-label" style={{ color: 'var(--ink-3)', fontSize: '10.5px' }}>
            Portfolio readiness
          </p>
          <p
            className="font-serif font-medium tabular-nums leading-[0.95] my-2.5"
            style={{ fontSize: '88px', letterSpacing: '-0.035em', color: 'var(--ink)' }}
          >
            {overallPct}<span style={{ fontSize: '40px', color: 'var(--ink-3)', marginLeft: '4px' }}>%</span>
          </p>
          <p className="font-serif italic text-[18px]" style={{ color: 'var(--ink-2)' }}>
            <span style={{ color: 'var(--ink-4)' }}>— </span>{readinessLevel}
          </p>

          <div className="mt-6 flex flex-col gap-[11px]">
            {readinessBars.map(bar => (
              <div
                key={bar.name}
                className="grid items-center gap-3.5"
                style={{ gridTemplateColumns: '150px 1fr 50px' }}
              >
                <span className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>{bar.name}</span>
                <div className="h-[6px] rounded-[1px] overflow-hidden" style={{ background: 'var(--paper-2)' }}>
                  <div
                    className="h-full"
                    style={{ width: `${bar.pct}%`, background: barColor(bar.pct) }}
                  />
                </div>
                <span
                  className="text-[11.5px] text-right tabular-nums"
                  style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}
                >
                  {bar.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: blockers */}
        <div className="px-[30px] py-7" style={{ background: 'var(--paper-2)' }}>
          <div className="flex items-baseline justify-between mb-3.5">
            <p className="font-serif font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>
              Outstanding blockers
            </p>
            {blockers.filter(b => b.severity === 'bad').length > 0 && (
              <span className="chip-bad inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {blockers.filter(b => b.severity === 'bad').length}
              </span>
            )}
          </div>

          {blockers.length === 0 ? (
            <p className="text-[12.5px] mt-6" style={{ color: 'var(--ink-3)' }}>
              No blockers found — portfolio is in good shape.
            </p>
          ) : (
            <ul className="space-y-0">
              {blockers.slice(0, 6).map((b, i) => (
                <li
                  key={i}
                  className="grid items-start gap-2.5 py-[10px]"
                  style={{
                    gridTemplateColumns: '18px 1fr auto',
                    borderBottom: i < blockers.length - 1 ? '1px solid var(--rule-2)' : 'none',
                  }}
                >
                  <span
                    className="w-[18px] h-[18px] rounded-[2px] grid place-items-center text-[10px] font-semibold mt-[1px] flex-shrink-0"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      background: b.severity === 'bad' ? 'var(--bad-wash)' : 'var(--warn-wash)',
                      color: b.severity === 'bad' ? 'var(--bad)' : 'var(--warn)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-[12.5px] leading-[1.4]" style={{ color: 'var(--ink-2)' }}>
                    {b.text}
                  </p>
                  <Link
                    href={b.href}
                    className="text-[11px] font-medium flex-shrink-0 self-center transition-opacity hover:opacity-70"
                    style={{ color: 'var(--nav-accent)', whiteSpace: 'nowrap' }}
                  >
                    {b.cta}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Stat row ────────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between mt-10 mb-4">
        <div>
          <p className="font-serif font-semibold text-[22px]" style={{ letterSpacing: '-0.015em' }}>
            Portfolio at a glance
          </p>
          <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
            Totals across all active sites and proposals
          </p>
        </div>
      </div>

      <div
        className="grid overflow-hidden rounded-sm"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          background: 'var(--rule)',
          border: '1px solid var(--rule)',
        }}
      >
        {[
          {
            label: 'Sites',
            value: siteCount,
            sub: `${orgCount} ${orgCount === 1 ? 'organization' : 'organizations'}`,
            href: '/sites',
          },
          {
            label: 'High / critical threats',
            value: highRiskThreats,
            sub: 'of all documented threats',
            href: '/analyzer',
          },
          {
            label: 'Active proposals',
            value: activeProposals,
            sub: `${submittedProposals} submitted`,
            href: '/sites',
          },
          {
            label: 'Total requested',
            value: formatCurrency(totalBudget),
            sub: siteCount > 0 ? `avg ${formatCurrency(Math.round(totalBudget / siteCount))} / site` : 'no budget yet',
            href: '/sites',
          },
        ].map(stat => (
          <Link key={stat.label} href={stat.href} className="group block bg-white px-5 py-[18px] hover:bg-[var(--paper-2)] transition-colors duration-150">
            <p className="font-mono-label" style={{ color: 'var(--ink-3)', fontSize: '10px' }}>
              {stat.label}
            </p>
            <p
              className="font-serif font-medium tabular-nums mt-1.5 leading-[1.1]"
              style={{ fontSize: '30px', letterSpacing: '-0.02em', color: 'var(--ink)' }}
            >
              {stat.value}
            </p>
            <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
              {stat.sub}
            </p>
          </Link>
        ))}
      </div>

      {/* ── Facility roster ─────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between mt-10 mb-4">
        <div>
          <p className="font-serif font-semibold text-[22px]" style={{ letterSpacing: '-0.015em' }}>
            Facilities
          </p>
          <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
            Readiness-sorted. Click any row to open the facility workbench.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/organizations/new"
            className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-sm text-[12px] font-medium border transition-colors"
            style={{ border: '1px solid var(--rule)', background: 'white', color: 'var(--ink)' }}
          >
            <Plus className="h-3 w-3" />
            New org
          </Link>
          <Link
            href="/sites/new"
            className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-sm text-[12px] font-medium border transition-colors"
            style={{ border: '1px solid var(--rule)', background: 'white', color: 'var(--ink)' }}
          >
            <Plus className="h-3 w-3" />
            New facility
          </Link>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-sm"
        style={{ background: 'white', border: '1px solid var(--rule)' }}
      >
        {/* Table head */}
        <div
          className="grid px-5 py-[11px]"
          style={{
            gridTemplateColumns: '1fr 100px 120px 120px 120px 90px',
            gap: '20px',
            background: 'var(--paper-2)',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          {['Site', 'Risk', 'Threats', 'Budget', 'Readiness', 'Status'].map(col => (
            <span
              key={col}
              className="font-mono-label"
              style={{ fontSize: '10.5px', color: 'var(--ink-3)' }}
            >
              {col}
            </span>
          ))}
        </div>

        {roster.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
              No facilities yet.{' '}
              <Link href="/sites/new" style={{ color: 'var(--nav-accent)' }}>
                Add your first facility →
              </Link>
            </p>
          </div>
        ) : (
          roster.map((row, i) => {
            const rc = riskClass(row.topLevel)
            const blockersText = row.blockers.length > 0
              ? `${row.blockers.length} blocker${row.blockers.length > 1 ? 's' : ''}`
              : null

            return (
              <Link
                key={row.id}
                href={`/sites/${row.id}`}
                className="group grid px-5 py-4 items-center transition-colors duration-100"
                style={{
                  gridTemplateColumns: '1fr 100px 120px 120px 120px 90px',
                  gap: '20px',
                  borderBottom: i < roster.length - 1 ? '1px solid var(--rule-2)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {/* Name + org */}
                <div>
                  <p className="font-semibold text-[14px] group-hover:text-[var(--nav-accent)] transition-colors" style={{ color: 'var(--ink)' }}>
                    {row.name}
                  </p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    {row.org}
                  </p>
                </div>

                {/* Risk pill */}
                <div>
                  {row.threatCount > 0 ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[11px] font-semibold ${rc}`}
                      style={{ fontFamily: 'var(--font-geist-mono)', letterSpacing: '0.03em', textTransform: 'uppercase' }}
                    >
                      <span className="text-[10px]">{row.maxScore}</span>
                      {riskLabel(row.topLevel)}
                    </span>
                  ) : (
                    <span className="chip-muted inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px]">
                      —
                    </span>
                  )}
                </div>

                {/* Threats */}
                <div className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>
                  {row.threatCount > 0 ? (
                    <>
                      {row.threatCount}{' '}
                      {row.criticalCount > 0 && (
                        <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                          {row.criticalCount} critical
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--ink-4)' }}>None</span>
                  )}
                </div>

                {/* Budget */}
                <div className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>
                  {row.budget > 0 ? (
                    <>
                      {formatCurrency(row.budget)}{' '}
                      <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                        {row.projectCount} {row.projectCount === 1 ? 'project' : 'projects'}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--ink-4)' }}>—</span>
                  )}
                </div>

                {/* Readiness mini bar */}
                <div className="flex items-center gap-2">
                  <div
                    className="h-[4px] w-[70px] relative"
                    style={{ background: 'var(--paper-2)' }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ width: `${row.readiness}%`, background: barColor(row.readiness) }}
                    />
                  </div>
                  <span
                    className="text-[11.5px] tabular-nums"
                    style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-2)' }}
                  >
                    {row.readiness}%
                  </span>
                </div>

                {/* Status chip */}
                <div>
                  {blockersText ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[11px] font-medium ${
                        row.blockers.length >= 2 ? 'chip-bad' : 'chip-warn'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {blockersText}
                    </span>
                  ) : row.threatCount > 0 ? (
                    <span className="chip-ok inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      Good
                    </span>
                  ) : (
                    <span className="chip-muted inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[11px] font-medium">
                      Empty
                    </span>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* Empty state CTA when no data at all */}
      {siteCount === 0 && (
        <div className="mt-10 px-9 py-12 text-center rounded-sm border" style={{ borderColor: 'var(--rule)', borderStyle: 'dashed' }}>
          <p className="font-serif text-[22px] font-medium mb-2" style={{ color: 'var(--ink-2)' }}>
            Start your NSGP application
          </p>
          <p className="text-[13.5px] mb-6" style={{ color: 'var(--ink-3)', maxWidth: '420px', margin: '0 auto 24px' }}>
            Add your organization and facilities to begin building your grant portfolio.
          </p>
          <Link
            href="/organizations/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-[13px] font-medium"
            style={{ background: 'var(--nav-accent)', color: '#fff' }}
          >
            <Plus className="h-4 w-4" />
            Add your first organization
          </Link>
        </div>
      )}
    </div>
  )
}
