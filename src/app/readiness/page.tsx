export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'
import { Check, Circle, AlertCircle, ChevronRight, MapPin } from 'lucide-react'

// ─── helpers ───────────────────────────────────────────────────────────────

const NARRATIVE_SECTIONS = [
  'executive_summary',
  'threat_overview',
  'vulnerability_statement',
  'project_justification',
  'budget_rationale',
  'implementation_approach',
]

const NARRATIVE_LABELS: Record<string, string> = {
  executive_summary:        'Executive Summary',
  threat_overview:          'Threat Overview',
  vulnerability_statement:  'Vulnerability Statement',
  project_justification:    'Project Justification',
  budget_rationale:         'Budget Rationale',
  implementation_approach:  'Implementation Approach',
}

function barColor(pct: number) {
  if (pct >= 80) return 'var(--ok)'
  if (pct >= 50) return 'var(--warn)'
  return 'var(--bad)'
}

function CheckItem({ done, label, detail, href }: {
  done: boolean; label: string; detail?: string; href?: string
}) {
  return (
    <div className="flex items-start gap-2.5 py-[7px]" style={{ borderBottom: '1px solid var(--rule-2)' }}>
      {done
        ? <Check className="h-3.5 w-3.5 mt-[1px] flex-shrink-0" style={{ color: 'var(--ok)' }} />
        : <Circle className="h-3.5 w-3.5 mt-[1px] flex-shrink-0" style={{ color: 'var(--rule)' }} />
      }
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px]" style={{ color: done ? 'var(--ink-2)' : 'var(--ink-3)' }}>{label}</p>
        {detail && <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-4)' }}>{detail}</p>}
      </div>
      {!done && href && (
        <Link
          href={href}
          className="text-[11.5px] font-medium flex-shrink-0 self-center transition-opacity hover:opacity-70"
          style={{ color: 'var(--nav-accent)' }}
        >
          Fix →
        </Link>
      )}
    </div>
  )
}

// ─── page ──────────────────────────────────────────────────────────────────

export default async function ReadinessPage() {
  const sites = await prisma.site.findMany({
    include: {
      organization: true,
      threatAssessments:  true,
      securityMeasures:   true,
      projectProposals:   { include: { budgetItems: true, threatLinks: true } },
      narrativeDrafts:    { orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }] },
      grantAnalyses:      { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: [{ targetCycleYear: 'asc' }, { updatedAt: 'desc' }],
  })

  // Per-site readiness
  const siteReadiness = sites.map((f) => {
    const highRiskThreats = f.threatAssessments.filter((t) => {
      const lvl = getRiskLevel(calculateRiskScore(t.likelihood, t.impact))
      return lvl === 'high' || lvl === 'critical'
    })

    const coveredSections = new Set<string>()
    for (const d of f.narrativeDrafts) {
      if (!coveredSections.has(d.sectionName)) {
        const text = d.editedText || d.generatedText || ''
        if (text.trim().length > 50) coveredSections.add(d.sectionName)
      }
    }

    const totalBudget = f.projectProposals.reduce(
      (s, p) => s + p.budgetItems.reduce((b, i) => b + i.totalCost, 0), 0
    )

    const projectsWithThreats = f.projectProposals.filter((p) => p.threatLinks.length > 0)
    const projectsWithBudget  = f.projectProposals.filter(
      (p) => p.budgetItems.length > 0 && p.budgetItems.some((b) => b.totalCost > 0)
    )

    const latestAnalysis = f.grantAnalyses[0] ?? null
    const leAgency       = (f as any).lawEnforcementAgency
    const leResponseDate = (f as any).lawEnforcementResponseDate
    const leContactDate  = (f as any).lawEnforcementContactDate

    const checks = {
      orgComplete:       !!(f.organization.einOrTaxId && f.organization.contactEmail && f.organization.address),
      siteComplete:      !!(f.populationServed && f.daysHoursOfOperation && f.address),
      hasThreats:        f.threatAssessments.length >= 2,
      hasHighRisk:       highRiskThreats.length > 0,
      hasMeasures:       f.securityMeasures.length >= 1,
      hasProjects:       f.projectProposals.length >= 1,
      projectsLinked:    f.projectProposals.length > 0 && projectsWithThreats.length === f.projectProposals.length,
      projectsBudgeted:  f.projectProposals.length > 0 && projectsWithBudget.length === f.projectProposals.length,
      narrativesCovered: NARRATIVE_SECTIONS.every((s) => coveredSections.has(s)),
      leContacted:       !!leAgency,
      leResponseReceived:!!leResponseDate,
      analysisRun:       !!latestAnalysis,
      analysisStrong:    latestAnalysis ? latestAnalysis.overallScore >= 70 : false,
    }

    const score = Object.values(checks).filter(Boolean).length
    const total = Object.keys(checks).length

    return {
      site: f,
      checks,
      score,
      total,
      coveredSections,
      totalBudget,
      latestAnalysis,
      leAgency,
      leContactDate,
      leResponseDate,
      highRiskThreats,
    }
  })

  // Group by funding cycle year
  const cycleGroups = new Map<number, typeof siteReadiness>()
  for (const r of siteReadiness) {
    const yr = r.site.targetCycleYear ?? 2026
    if (!cycleGroups.has(yr)) cycleGroups.set(yr, [])
    cycleGroups.get(yr)!.push(r)
  }
  const cycles = [...cycleGroups.entries()].sort(([a], [b]) => a - b)

  const overallReady = siteReadiness.filter((r) => r.score / r.total >= 0.8).length
  const totalBudgetAll = siteReadiness.reduce((s, r) => s + r.totalBudget, 0)

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Readiness Review' }]} />
      <div className="px-8 pb-16">

        {/* Page header */}
        <div className="pt-8 pb-6">
          <p className="eyebrow mb-2.5">Pre-submission checklist · By site and cycle</p>
          <h1 className="font-serif font-medium" style={{ fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Readiness Review
          </h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: 'var(--ink-3)' }}>
            Complete these steps before submission. Each site is reviewed independently within its funding cycle.
          </p>
        </div>

        {/* Summary stat row */}
        <div
          className="grid overflow-hidden rounded-sm mb-8"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--rule)', border: '1px solid var(--rule)' }}
        >
          {[
            { label: 'Sites in Portfolio', value: sites.length.toString(), sub: `${cycles.length} funding ${cycles.length === 1 ? 'cycle' : 'cycles'}` },
            { label: 'Sites ≥ 80% Ready',  value: overallReady.toString(), sub: `of ${sites.length} total` },
            { label: 'Total Budget Built', value: formatCurrency(totalBudgetAll), sub: 'across all projects' },
          ].map(stat => (
            <div key={stat.label} className="bg-white px-5 py-[18px]">
              <p className="font-mono-label" style={{ fontSize: '10px', color: 'var(--ink-3)' }}>{stat.label}</p>
              <p className="font-serif font-medium tabular-nums mt-1.5" style={{ fontSize: '30px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                {stat.value}
              </p>
              <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Preparation callout */}
        <div className="mb-8 px-5 py-4 rounded-sm" style={{ borderLeft: '3px solid var(--warn)', background: 'var(--warn-wash)' }}>
          <p className="font-semibold text-[13px] mb-2" style={{ color: 'var(--ink)' }}>
            <AlertCircle className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" style={{ color: 'var(--warn)' }} />
            While you wait for the announcement
          </p>
          <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[
              'Contact local Police or Sheriff for each site threat assessment',
              'Confirm 501(c)(3) status letter and EIN are readily available',
              'Gather vendor quotes for all proposed security equipment',
              'Collect incident reports or letters documenting prior threats',
              'Identify an authorized representative for grant signatures',
              'Verify SAM.gov registration is active and not expired',
              'Review FEMA NSGP NOFO when released for eligibility changes',
              'Ensure all narrative drafts are complete and finalized',
            ].map((tip, i) => (
              <p key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0 bg-current" style={{ color: 'var(--warn)' }} />
                {tip}
              </p>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {sites.length === 0 && (
          <div className="px-9 py-14 text-center rounded-sm border" style={{ borderColor: 'var(--rule)', borderStyle: 'dashed' }}>
            <MapPin className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <p className="font-serif text-[18px] mb-1" style={{ color: 'var(--ink-2)' }}>No sites yet</p>
            <p className="text-[13px] mb-5" style={{ color: 'var(--ink-3)' }}>Add an organization and site to start tracking readiness.</p>
            <Link
              href="/sites/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-[13px] font-medium"
              style={{ background: 'var(--nav-accent)', color: '#fff' }}
            >
              Add First Site
            </Link>
          </div>
        )}

        {/* Cycles */}
        {cycles.map(([year, group]) => {
          const cycleReady   = group.filter(r => r.score / r.total >= 0.8).length
          const cycleBudget  = group.reduce((s, r) => s + r.totalBudget, 0)
          const cycleAvgPct  = group.length > 0
            ? Math.round(group.reduce((s, r) => s + (r.score / r.total) * 100, 0) / group.length)
            : 0

          return (
            <div key={year} className="mb-10">
              {/* Cycle heading */}
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <p className="font-serif font-semibold text-[22px]" style={{ letterSpacing: '-0.015em', color: 'var(--ink)' }}>
                    FY{year} Application Cycle
                  </p>
                  <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    {group.length} {group.length === 1 ? 'site' : 'sites'} · {cycleReady} ready · avg {cycleAvgPct}% · {formatCurrency(cycleBudget)} total
                  </p>
                </div>
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-sm text-[12px] font-medium"
                  style={{
                    background: cycleAvgPct >= 80 ? 'var(--ok-wash)' : cycleAvgPct >= 50 ? 'var(--warn-wash)' : 'var(--bad-wash)',
                    color: cycleAvgPct >= 80 ? 'var(--ok)' : cycleAvgPct >= 50 ? 'var(--warn)' : 'var(--bad)',
                  }}
                >
                  {cycleAvgPct >= 80 ? 'Cycle ready' : cycleAvgPct >= 50 ? 'In progress' : 'Needs work'}
                </span>
              </div>

              {/* Site cards */}
              <div className="flex flex-col" style={{ gap: '1px', background: 'var(--rule)', border: '1px solid var(--rule)', borderRadius: '3px', overflow: 'hidden' }}>
                {group.map(({ site: f, checks, score, total, coveredSections, totalBudget, latestAnalysis, leAgency, leContactDate, leResponseDate }) => {
                  const pct = Math.round((score / total) * 100)

                  return (
                    <div key={f.id} className="bg-white">
                      {/* Site header */}
                      <div
                        className="flex items-center gap-4 px-5 py-4"
                        style={{ borderBottom: '1px solid var(--rule-2)' }}
                      >
                        {/* Readiness ring */}
                        <div className="relative flex-shrink-0 w-11 h-11">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--rule-2)" strokeWidth="3.5" />
                            <circle
                              cx="20" cy="20" r="16" fill="none"
                              stroke={barColor(pct)} strokeWidth="3.5"
                              strokeDasharray={`${pct} 100`}
                              strokeDashoffset="0"
                              strokeLinecap="round"
                              pathLength="100"
                            />
                          </svg>
                          <span
                            className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
                            style={{ fontSize: '10px', fontFamily: 'var(--font-geist-mono)', color: 'var(--ink)' }}
                          >
                            {pct}%
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[14.5px]" style={{ color: 'var(--ink)' }}>
                              {f.siteName}
                            </p>
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10.5px] font-medium"
                              style={{ background: 'var(--nav-wash)', color: 'var(--nav-accent)', fontFamily: 'var(--font-geist-mono)' }}
                            >
                              FY{year}
                            </span>
                          </div>
                          <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                            {f.organization.name}
                            {totalBudget > 0 && ` · ${formatCurrency(totalBudget)}`}
                          </p>
                        </div>

                        <Link
                          href={`/sites/${f.id}`}
                          className="inline-flex items-center gap-1 text-[12.5px] font-medium flex-shrink-0 transition-opacity hover:opacity-70"
                          style={{ color: 'var(--nav-accent)' }}
                        >
                          Open <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      {/* Checklist body */}
                      <div className="grid px-5 py-4 gap-x-10" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        {/* Left column */}
                        <div>
                          <p className="font-mono-label mb-1" style={{ fontSize: '9.5px', color: 'var(--ink-4)' }}>
                            Organization &amp; Site
                          </p>
                          <CheckItem done={checks.orgComplete}  label="Org has EIN, contact email, address"    href={`/organizations/${f.organizationId}/edit`} />
                          <CheckItem done={checks.siteComplete} label="Site has address, population, hours"    href={`/sites/${f.id}/edit`} />

                          <p className="font-mono-label mt-4 mb-1" style={{ fontSize: '9.5px', color: 'var(--ink-4)' }}>
                            Threat Assessment
                          </p>
                          <CheckItem done={checks.hasThreats}   label="≥ 2 threats documented" detail={`${f.threatAssessments.length} on file`} href={`/sites/${f.id}/threats/new`} />
                          <CheckItem done={checks.hasHighRisk}  label="≥ 1 high or critical threat"           href={`/sites/${f.id}/threats`} />
                          <CheckItem done={checks.hasMeasures}  label="Security measures documented" detail={`${f.securityMeasures.length} on file`} href={`/sites/${f.id}/measures/new`} />

                          <p className="font-mono-label mt-4 mb-1" style={{ fontSize: '9.5px', color: 'var(--ink-4)' }}>
                            Law Enforcement
                          </p>
                          <CheckItem
                            done={checks.leContacted}
                            label={leAgency ? `Contacted: ${leAgency}` : 'Contacted Police / Sheriff'}
                            detail={leContactDate ? `Requested ${new Date(leContactDate).toLocaleDateString()}` : undefined}
                            href={`/sites/${f.id}/edit`}
                          />
                          <CheckItem
                            done={checks.leResponseReceived}
                            label="Assessment received"
                            detail={leResponseDate ? `Received ${new Date(leResponseDate).toLocaleDateString()}` : 'Log date when it arrives'}
                            href={`/sites/${f.id}/edit`}
                          />
                        </div>

                        {/* Right column */}
                        <div>
                          <p className="font-mono-label mb-1" style={{ fontSize: '9.5px', color: 'var(--ink-4)' }}>
                            Projects &amp; Budget
                          </p>
                          <CheckItem done={checks.hasProjects}      label="≥ 1 project proposal" detail={`${f.projectProposals.length} created`} href={`/sites/${f.id}/projects/new`} />
                          <CheckItem done={checks.projectsLinked}   label="All projects linked to a threat"    href={`/sites/${f.id}/projects`} />
                          <CheckItem done={checks.projectsBudgeted} label="All projects have budget items"     href={`/sites/${f.id}/projects`} />

                          <p className="font-mono-label mt-4 mb-1" style={{ fontSize: '9.5px', color: 'var(--ink-4)' }}>
                            Narratives
                          </p>
                          {NARRATIVE_SECTIONS.map(s => (
                            <CheckItem key={s} done={coveredSections.has(s)} label={NARRATIVE_LABELS[s]} href={`/sites/${f.id}/narratives`} />
                          ))}

                          <p className="font-mono-label mt-4 mb-1" style={{ fontSize: '9.5px', color: 'var(--ink-4)' }}>
                            Grant Strength
                          </p>
                          <CheckItem
                            done={checks.analysisRun}
                            label="Analyzer run"
                            detail={latestAnalysis ? `Score: ${latestAnalysis.overallScore}/100` : undefined}
                            href={`/analyzer/${f.id}`}
                          />
                          <CheckItem
                            done={checks.analysisStrong}
                            label="Score ≥ 70 / 100"
                            detail={latestAnalysis ? `Current: ${latestAnalysis.overallScore}` : 'Run analysis first'}
                            href={`/analyzer/${f.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
