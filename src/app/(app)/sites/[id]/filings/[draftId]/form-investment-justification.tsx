import type { FilingSnapshot } from '@/actions/filings'
import { formatCurrency } from '@/lib/scoring'
import { cleanText } from '@/lib/export-text'

const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  threat_overview: 'Threat Overview',
  vulnerability_statement: 'Vulnerability Statement',
  project_justification: 'Project Justification',
  budget_rationale: 'Budget Rationale',
  implementation_approach: 'Implementation Approach',
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function IjSection({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
      <div className="flex items-baseline gap-3 border-b-2 border-slate-800 pb-1 mb-3">
        <span className="text-sm font-bold text-slate-500">Part {number}</span>
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      <span className="col-span-2 text-sm text-slate-800">
        {value || <span className="text-slate-300 italic">Not provided</span>}
      </span>
    </div>
  )
}

/** A project sub-section that always renders — shows a warning when blank. */
function ProjectSection({
  label,
  value,
  systemGap = false,
}: {
  label: string
  value?: string | null
  /** True when the field doesn't exist in the system (e.g. timeline) */
  systemGap?: boolean
}) {
  const { cleaned, flags } = value ? cleanText(value) : { cleaned: '', flags: [] }
  const empty = !cleaned

  return (
    <div
      className={`rounded border p-3 ${
        empty
          ? systemGap
            ? 'border-blue-200 bg-blue-50'
            : 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-white'
      }`}
      style={{ pageBreakInside: 'avoid' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-2">
        <span className={empty ? (systemGap ? 'text-blue-600' : 'text-amber-700') : 'text-slate-500'}>
          {label}
        </span>
        {empty && (
          <span
            className={`text-[9px] font-bold border rounded px-1 ${
              systemGap
                ? 'border-blue-300 text-blue-500'
                : 'border-amber-400 text-amber-600'
            }`}
          >
            {systemGap ? 'COMPLETE MANUALLY' : 'BLANK — REQUIRED'}
          </span>
        )}
      </p>

      {empty ? (
        <p className={`text-xs italic ${systemGap ? 'text-blue-500' : 'text-amber-600'}`}>
          {systemGap
            ? 'This section is not captured by NSGP Builder — write narrative and attach before submission.'
            : 'No content entered. Add this in the project editor before submission.'}
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{cleaned}</p>
          {flags.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {flags.map((f, i) => (
                <p key={i} className="text-[10px] text-amber-600 italic">
                  ⚠ {f}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FormInvestmentJustification({ snapshot }: { snapshot: FilingSnapshot }) {
  const { organization: org, threats, securityMeasures, projects, narratives, totalBudget } =
    snapshot
  const site = snapshot.site ?? { siteName: 'Unknown Site', id: '', address: null }
  const orgAddress = [org.address, org.city, org.state, org.zip].filter(Boolean).join(', ')
  const highRisk = threats.filter((t) => t.riskLevel === 'high' || t.riskLevel === 'critical')
  const leReceived = !!(site as Record<string, unknown>).lawEnforcementResponseDate

  return (
    <div className="font-sans text-gray-900 bg-white" id="form-ij">
      {/* ── Cover ── */}
      <div className="bg-slate-900 text-white px-8 py-8 mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
          NSGP Investment Justification
        </p>
        <h1 className="text-2xl font-bold mb-1">{org.name}</h1>
        <p className="text-lg text-slate-300">{site.siteName}</p>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-300">
          {orgAddress && <span>{orgAddress}</span>}
          {org.einOrTaxId && <span>EIN: {org.einOrTaxId}</span>}
          <span>Total Request: {formatCurrency(totalBudget)}</span>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-0">
        {/* ── Part 1 — Applicant Information ── */}
        <IjSection number="1" title="Applicant Information">
          <div className="bg-slate-50 rounded border p-4 space-y-0">
            <InfoRow label="Organization Legal Name" value={org.name} />
            <InfoRow label="Denomination / Affiliation" value={org.denomination} />
            <InfoRow label="EIN / Tax ID" value={org.einOrTaxId} />
            <InfoRow label="Mailing Address" value={orgAddress} />
            <InfoRow label="Primary Contact" value={org.contactName} />
            <InfoRow label="Contact Phone" value={org.contactPhone} />
            <InfoRow label="Contact Email" value={org.contactEmail} />
            <InfoRow label="Organization Type" value="Nonprofit — 501(c)(3)" />
            <InfoRow label="Site Name" value={site.siteName} />
            <InfoRow label="Site Address" value={site.address || orgAddress} />
            <InfoRow
              label="Population Served"
              value={(site as Record<string, unknown>).populationServed as string}
            />
            <InfoRow
              label="Hours of Operation"
              value={(site as Record<string, unknown>).daysHoursOfOperation as string}
            />
          </div>
        </IjSection>

        {/* ── Part 2 — Vulnerability & Threat Assessment ── */}
        <IjSection number="2" title="Vulnerability & Threat Assessment">
          {/* Law enforcement callout */}
          {!!(site as Record<string, unknown>).lawEnforcementAgency && (
            <div
              className={`mb-4 rounded border px-4 py-3 ${
                leReceived ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                  leReceived ? 'text-blue-700' : 'text-amber-700'
                }`}
              >
                Law Enforcement Threat Assessment
              </p>
              <p className="text-sm">
                <strong>
                  {(site as Record<string, unknown>).lawEnforcementAgency as string}
                </strong>
                {(site as Record<string, unknown>).lawEnforcementContactName
                  ? ` — ${(site as Record<string, unknown>).lawEnforcementContactName as string}`
                  : null}
                {leReceived
                  ? ` · Assessment received ${new Date(
                      (site as Record<string, unknown>).lawEnforcementResponseDate as string,
                    ).toLocaleDateString()}`
                  : ` · Requested ${
                      (site as Record<string, unknown>).lawEnforcementContactDate
                        ? new Date(
                            (site as Record<string, unknown>).lawEnforcementContactDate as string,
                          ).toLocaleDateString()
                        : ''
                    } — pending response`}
              </p>
              {!!(site as Record<string, unknown>).lawEnforcementFindings && (
                <p className="text-sm mt-2 text-slate-700 italic">
                  {(site as Record<string, unknown>).lawEnforcementFindings as string}
                </p>
              )}
            </div>
          )}

          {/* Generated narratives */}
          {(['threat_overview', 'vulnerability_statement'] as const).map((key) =>
            narratives[key] ? (
              <div key={key} className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {SECTION_LABELS[key]}
                </p>
                {(() => {
                  const { cleaned, flags } = cleanText(narratives[key])
                  return (
                    <>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {cleaned}
                      </p>
                      {flags.map((f, i) => (
                        <p key={i} className="text-[10px] text-amber-600 italic mt-1">
                          ⚠ {f}
                        </p>
                      ))}
                    </>
                  )
                })()}
              </div>
            ) : null,
          )}

          {/* Threat matrix */}
          {threats.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Threat Assessment Matrix
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left">Threat</th>
                    <th className="border border-slate-300 p-2 text-center">Likelihood</th>
                    <th className="border border-slate-300 p-2 text-center">Impact</th>
                    <th className="border border-slate-300 p-2 text-center">Score</th>
                    <th className="border border-slate-300 p-2 text-center">Level</th>
                    <th className="border border-slate-300 p-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {threats.map((t) => (
                    <tr
                      key={t.id}
                      className={
                        t.riskLevel === 'critical'
                          ? 'bg-red-50'
                          : t.riskLevel === 'high'
                            ? 'bg-orange-50'
                            : ''
                      }
                    >
                      <td className="border border-slate-300 p-2">
                        <p className="font-medium">{t.threatType}</p>
                        {t.description && (
                          <p className="text-xs text-slate-500">{t.description}</p>
                        )}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">{t.likelihood}/5</td>
                      <td className="border border-slate-300 p-2 text-center">{t.impact}/5</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {t.riskScore}
                      </td>
                      <td className="border border-slate-300 p-2 text-center capitalize">
                        {t.riskLevel}
                      </td>
                      <td className="border border-slate-300 p-2 text-xs capitalize">
                        {t.source === 'law_enforcement'
                          ? `Law Enforcement${t.sourceAgency ? ` (${t.sourceAgency})` : ''}`
                          : t.source === 'third_party'
                            ? `Third-Party${t.sourceAgency ? ` (${t.sourceAgency})` : ''}`
                            : t.source === 'media_reports'
                              ? 'Media / Public'
                              : 'Self-Assessed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-1">
                {highRisk.length} high/critical risk threat{highRisk.length !== 1 ? 's' : ''}{' '}
                identified
              </p>
            </div>
          )}

          {/* Existing security measures */}
          {securityMeasures.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Current Security Measures
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left">Category</th>
                    <th className="border border-slate-300 p-2 text-left">Description</th>
                    <th className="border border-slate-300 p-2 text-center">Effectiveness</th>
                    <th className="border border-slate-300 p-2 text-left">Gaps</th>
                  </tr>
                </thead>
                <tbody>
                  {securityMeasures.map((m) => (
                    <tr key={m.id}>
                      <td className="border border-slate-300 p-2 font-medium">{m.category}</td>
                      <td className="border border-slate-300 p-2 text-slate-600">
                        {m.description || '—'}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {m.effectivenessRating}/5
                      </td>
                      <td className="border border-slate-300 p-2 text-slate-600">
                        {m.gapsRemaining || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </IjSection>

        {/* ── Part 3 — Proposed Security Investments ── */}
        <IjSection number="3" title="Proposed Security Investments">
          {narratives['project_justification'] && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Investment Overview
              </p>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {cleanText(narratives['project_justification']).cleaned}
              </p>
            </div>
          )}

          {projects.map((project, i) => {
            // Build a de-duplicated list of the threat types this project links to
            const linkedThreats =
              project.linkedThreatTypes.length > 0
                ? project.linkedThreatTypes
                : threats
                    .filter((t) => t.riskLevel === 'high' || t.riskLevel === 'critical')
                    .map((t) => t.threatType)

            return (
              <div
                key={project.id}
                className="mb-8 border border-slate-200 rounded overflow-hidden"
                style={{ pageBreakInside: 'avoid' }}
              >
                {/* Project header */}
                <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
                  <p className="font-semibold text-sm">
                    Project {i + 1}: {project.title}
                  </p>
                  <p className="text-sm text-emerald-300 font-bold">
                    {formatCurrency(project.projectBudget)}
                  </p>
                </div>

                <div className="p-4 grid grid-cols-1 gap-3">
                  {/* Threat alignment — always shown */}
                  <div className="rounded border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Threats Addressed
                    </p>
                    {linkedThreats.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {linkedThreats.map((tt) => (
                          <span
                            key={tt}
                            className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded"
                          >
                            {tt}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 italic">
                        No threats linked — link threats in the project editor
                      </p>
                    )}
                  </div>

                  {/* Required narrative sections — always render, flag if blank */}
                  <ProjectSection
                    label="Problem Statement"
                    value={project.problemStatement}
                  />
                  <ProjectSection
                    label="Proposed Solution"
                    value={project.proposedSolution}
                  />
                  <ProjectSection
                    label="Risk Reduction Rationale"
                    value={project.riskReductionRationale}
                  />
                  <ProjectSection
                    label="Implementation Plan"
                    value={project.implementationNotes}
                  />

                  {/* System-gap sections — not in DB, always prompt manual entry */}
                  <ProjectSection
                    label="Estimated Timeline / Milestones"
                    value={null}
                    systemGap
                  />
                  <ProjectSection
                    label="Sustainment / Maintenance Plan"
                    value={null}
                    systemGap
                  />
                </div>
              </div>
            )
          })}
        </IjSection>

        {/* ── Part 4 — Implementation Approach (narrative-level) ── */}
        {narratives['implementation_approach'] && (
          <IjSection number="4" title="Implementation Approach">
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {cleanText(narratives['implementation_approach']).cleaned}
            </p>
          </IjSection>
        )}
      </div>
    </div>
  )
}
