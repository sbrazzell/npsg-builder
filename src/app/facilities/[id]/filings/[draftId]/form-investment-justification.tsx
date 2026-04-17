import type { FilingSnapshot } from '@/actions/filings'
import { formatCurrency } from '@/lib/scoring'

const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  threat_overview: 'Threat Overview',
  vulnerability_statement: 'Vulnerability Statement',
  project_justification: 'Project Justification',
  budget_rationale: 'Budget Rationale',
  implementation_approach: 'Implementation Approach',
}

function IjSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
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
      <span className="col-span-2 text-sm text-slate-800">{value || <span className="text-slate-300 italic">Not provided</span>}</span>
    </div>
  )
}

export function FormInvestmentJustification({ snapshot }: { snapshot: FilingSnapshot }) {
  const { organization: org, facility, threats, securityMeasures, projects, narratives, totalBudget } = snapshot
  const orgAddress = [org.address, org.city, org.state, org.zip].filter(Boolean).join(', ')
  const highRisk = threats.filter((t) => t.riskLevel === 'high' || t.riskLevel === 'critical')
  const leReceived = !!(facility as any).lawEnforcementResponseDate

  return (
    <div className="font-sans text-gray-900 bg-white" id="form-ij">
      {/* Cover */}
      <div className="bg-slate-900 text-white px-8 py-8 mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">NSGP Investment Justification</p>
        <h1 className="text-2xl font-bold mb-1">{org.name}</h1>
        <p className="text-lg text-slate-300">{facility.facilityName}</p>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-300">
          {orgAddress && <span>{orgAddress}</span>}
          {org.einOrTaxId && <span>EIN: {org.einOrTaxId}</span>}
          <span>Total Request: {formatCurrency(totalBudget)}</span>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-0">
        {/* Part 1 — Applicant Information */}
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
            <InfoRow label="Facility Name" value={facility.facilityName} />
            <InfoRow label="Facility Address" value={facility.address || orgAddress} />
            <InfoRow label="Population Served" value={facility.populationServed} />
            <InfoRow label="Hours of Operation" value={facility.daysHoursOfOperation} />
          </div>
        </IjSection>

        {/* Part 2 — Vulnerability & Threat Narrative */}
        <IjSection number="2" title="Vulnerability & Threat Assessment">
          {/* Law enforcement callout */}
          {(facility as any).lawEnforcementAgency && (
            <div className={`mb-4 rounded border px-4 py-3 ${leReceived ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${leReceived ? 'text-blue-700' : 'text-amber-700'}`}>
                Law Enforcement Threat Assessment
              </p>
              <p className="text-sm">
                <strong>{(facility as any).lawEnforcementAgency}</strong>
                {(facility as any).lawEnforcementContactName && ` — ${(facility as any).lawEnforcementContactName}`}
                {leReceived
                  ? ` · Assessment received ${new Date((facility as any).lawEnforcementResponseDate).toLocaleDateString()}`
                  : ` · Requested ${(facility as any).lawEnforcementContactDate ? new Date((facility as any).lawEnforcementContactDate).toLocaleDateString() : ''} — pending response`}
              </p>
              {(facility as any).lawEnforcementFindings && (
                <p className="text-sm mt-2 text-slate-700 italic">{(facility as any).lawEnforcementFindings}</p>
              )}
            </div>
          )}

          {/* Generated narratives */}
          {(['threat_overview', 'vulnerability_statement'] as const).map((key) => (
            narratives[key] ? (
              <div key={key} className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{SECTION_LABELS[key]}</p>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{narratives[key]}</p>
              </div>
            ) : null
          ))}

          {/* Threat matrix */}
          {threats.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Threat Assessment Matrix</p>
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
                    <tr key={t.id} className={`${t.riskLevel === 'critical' ? 'bg-red-50' : t.riskLevel === 'high' ? 'bg-orange-50' : ''}`}>
                      <td className="border border-slate-300 p-2">
                        <p className="font-medium">{t.threatType}</p>
                        {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">{t.likelihood}/5</td>
                      <td className="border border-slate-300 p-2 text-center">{t.impact}/5</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{t.riskScore}</td>
                      <td className="border border-slate-300 p-2 text-center capitalize">{t.riskLevel}</td>
                      <td className="border border-slate-300 p-2 text-xs capitalize">
                        {t.source === 'law_enforcement' ? `🔵 Law Enforcement${t.sourceAgency ? ` (${t.sourceAgency})` : ''}` :
                         t.source === 'third_party' ? `Third-Party${t.sourceAgency ? ` (${t.sourceAgency})` : ''}` :
                         t.source === 'media_reports' ? 'Media / Public' : 'Self-Assessed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-1">{highRisk.length} high/critical risk threat{highRisk.length !== 1 ? 's' : ''} identified</p>
            </div>
          )}

          {/* Existing measures */}
          {securityMeasures.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Current Security Measures</p>
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
                      <td className="border border-slate-300 p-2 text-slate-600">{m.description || '—'}</td>
                      <td className="border border-slate-300 p-2 text-center">{m.effectivenessRating}/5</td>
                      <td className="border border-slate-300 p-2 text-slate-600">{m.gapsRemaining || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </IjSection>

        {/* Part 3 — Proposed Projects */}
        <IjSection number="3" title="Proposed Security Investments">
          {narratives['project_justification'] && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Investment Overview</p>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{narratives['project_justification']}</p>
            </div>
          )}

          {projects.map((project, i) => (
            <div key={project.id} className="mb-6 border border-slate-200 rounded overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                <p className="font-semibold text-sm">Project {i + 1}: {project.title}</p>
                <p className="text-sm text-emerald-300 font-bold">{formatCurrency(project.projectBudget)}</p>
              </div>
              <div className="p-4 grid grid-cols-1 gap-3 text-sm">
                {project.linkedThreatTypes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Threats Addressed</p>
                    <p>{project.linkedThreatTypes.join(', ')}</p>
                  </div>
                )}
                {project.problemStatement && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Problem Statement</p>
                    <p className="text-slate-700">{project.problemStatement}</p>
                  </div>
                )}
                {project.proposedSolution && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Proposed Solution</p>
                    <p className="text-slate-700">{project.proposedSolution}</p>
                  </div>
                )}
                {project.riskReductionRationale && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Risk Reduction Rationale</p>
                    <p className="text-slate-700">{project.riskReductionRationale}</p>
                  </div>
                )}
                {project.implementationNotes && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Implementation Plan</p>
                    <p className="text-slate-700">{project.implementationNotes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </IjSection>

        {/* Part 4 — Implementation */}
        {narratives['implementation_approach'] && (
          <IjSection number="4" title="Implementation Approach">
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{narratives['implementation_approach']}</p>
          </IjSection>
        )}
      </div>
    </div>
  )
}
