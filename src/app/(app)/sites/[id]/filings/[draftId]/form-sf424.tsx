import type { FilingSnapshot } from '@/actions/filings'
import { formatCurrency } from '@/lib/scoring'
import { isPlaceholder } from '@/lib/export-validation'

const CFDA = '97.008'
const FEDERAL_AGENCY = 'Department of Homeland Security / Federal Emergency Management Agency'
const PROGRAM_TITLE = 'Nonprofit Security Grant Program (NSGP)'

// Fields that are intentionally blank until FEMA releases the NOFO — shown as
// "info" placeholders in blue rather than error amber.
const NOFO_DEPENDENT_LABELS = new Set([
  'Congressional District of Applicant',
  'Congressional District of Project',
  'Proposed Start Date',
  'Proposed End Date',
])

type FieldVariant = 'normal' | 'error' | 'info'

function Field({
  label,
  value,
  wide,
}: {
  label: string
  value?: string | null
  wide?: boolean
}) {
  const blank = isPlaceholder(value)
  const variant: FieldVariant = blank
    ? NOFO_DEPENDENT_LABELS.has(label)
      ? 'info'
      : 'error'
    : 'normal'

  const headerBg =
    variant === 'error'
      ? 'bg-amber-100'
      : variant === 'info'
        ? 'bg-blue-50'
        : 'bg-gray-100'

  const borderColor =
    variant === 'error'
      ? 'border-amber-400'
      : variant === 'info'
        ? 'border-blue-300'
        : 'border-gray-400'

  const textColor =
    variant === 'error'
      ? 'text-amber-700'
      : variant === 'info'
        ? 'text-blue-600'
        : ''

  const badge =
    variant === 'error' ? (
      <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-amber-600 border border-amber-400 rounded px-1">
        Complete before submission
      </span>
    ) : variant === 'info' ? (
      <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-blue-500 border border-blue-300 rounded px-1">
        Complete after NOFO
      </span>
    ) : null

  return (
    <div className={`border ${borderColor} ${wide ? 'col-span-2' : ''}`}>
      <div className={`${headerBg} px-2 py-0.5 border-b ${borderColor} flex items-center flex-wrap gap-1`}>
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        {badge}
      </div>
      <div className={`px-2 py-1.5 min-h-[28px] ${blank ? 'bg-amber-50/40' : ''}`}>
        <span className={`text-sm italic ${textColor}`}>{value || ''}</span>
      </div>
    </div>
  )
}

function SectionHeader({ number, title }: { number?: string; title: string }) {
  return (
    <div className="col-span-2 bg-slate-800 text-white px-3 py-1.5 flex items-center gap-3">
      {number && (
        <span className="text-xs font-bold bg-white text-slate-800 rounded px-1.5 py-0.5">
          {number}
        </span>
      )}
      <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
    </div>
  )
}

export function FormSF424({ snapshot }: { snapshot: FilingSnapshot }) {
  const { organization: org, projects, totalBudget } = snapshot
  // Guard against legacy snapshots that may be missing the site field
  const site = snapshot.site ?? { siteName: 'Unknown Site', id: '', address: null }
  const orgAddress = [org.address, org.city, org.state, org.zip].filter(Boolean).join(', ')
  const today = new Date(snapshot.capturedAt).toLocaleDateString('en-US')
  const projectTitles = projects.map((p) => p.title).join('; ')

  return (
    <div className="font-sans text-gray-900 bg-white" id="form-sf424">
      <div className="border-2 border-gray-800 mb-0">
        {/* ── Form header ── */}
        <div className="bg-slate-800 text-white px-4 py-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">
              OMB Number: 4040-0004
            </p>
            <p className="text-xl font-bold">Application for Federal Assistance (SF-424)</p>
            <p className="text-sm text-slate-300 mt-0.5">
              Nonprofit Security Grant Program · CFDA {CFDA}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400 shrink-0">
            <p>Expiration Date: 02/28/2026</p>
            <p className="mt-1">Version: Pre-Submission Draft</p>
          </div>
        </div>

        {/* ── Field grid ── */}
        <div className="p-4 grid grid-cols-2 gap-0.5 bg-gray-200">
          <SectionHeader number="1" title="Submission Type" />
          <Field label="Type of Submission" value="Application" />
          <Field label="Type of Application" value="New" />

          <SectionHeader number="2" title="Date & Identifier" />
          <Field label="Date Received" value={today} />
          <Field
            label="Applicant Identifier (EIN)"
            value={org.einOrTaxId || null}
          />

          <SectionHeader number="3" title="Federal Funding Information" />
          <Field label="Federal Entity Identifier" value="(Assigned upon award)" />
          <Field label="Federal Award Identifier" value="(New application)" />
          <Field label="CFDA Number" value={CFDA} />
          <Field label="CFDA Title" value={PROGRAM_TITLE} />

          <SectionHeader number="4" title="Applicant Information" />
          <Field label="Legal Name of Applicant Organization" value={org.name} wide />
          <Field label="Organization Type" value="Non-profit Organization" />
          <Field label="Employer / Taxpayer ID (EIN)" value={org.einOrTaxId || null} />
          <Field label="Organizational Unit / Denomination" value={org.denomination || null} wide />
          <Field label="Mailing Address" value={orgAddress || null} wide />
          <Field label="Name of Primary Contact" value={org.contactName || null} />
          <Field label="Contact Phone" value={org.contactPhone || null} />
          <Field label="Contact Email" value={org.contactEmail || null} wide />

          <SectionHeader number="5" title="Project / Site Information" />
          <Field label="Federal Agency" value={FEDERAL_AGENCY} wide />
          <Field label="Program Title" value={PROGRAM_TITLE} wide />
          <Field
            label="Descriptive Title of Applicant's Project"
            value={`Security enhancements for ${site.siteName}: ${projectTitles || 'Physical security improvements'}`}
            wide
          />
          <Field label="Project Location — Site Name" value={site.siteName} />
          <Field label="Project Location — Address" value={site.address || org.address || null} />
          <Field
            label="Areas Affected by Project"
            value={[org.city, org.state].filter(Boolean).join(', ') || null}
          />
          <Field
            label="Congressional District of Applicant"
            value={null}
          />
          <Field
            label="Congressional District of Project"
            value={null}
          />

          <SectionHeader number="6" title="Proposed Project Dates" />
          <Field label="Proposed Start Date" value={null} />
          <Field label="Proposed End Date" value={null} />

          <SectionHeader number="7" title="Estimated Funding ($)" />
          <Field label="a. Federal" value={formatCurrency(totalBudget)} />
          <Field label="b. Applicant" value="$0.00" />
          <Field label="c. State" value="$0.00" />
          <Field label="d. Local" value="$0.00" />
          <Field label="e. Other" value="$0.00" />
          <Field label="f. Program Income" value="$0.00" />
          <Field label="g. TOTAL" value={formatCurrency(totalBudget)} />

          <SectionHeader number="8" title="Compliance & Certifications" />
          <Field
            label="Is application subject to state executive order 12372 review?"
            value="No"
          />
          <Field label="Is the applicant delinquent on any federal debt?" value="No" />

          <SectionHeader number="9" title="Authorized Organization Representative" />
          <Field label="Name" value={org.contactName || null} />
          <Field label="Title" value={null} />
          <Field label="Phone" value={org.contactPhone || null} />
          <Field label="Email" value={org.contactEmail || null} />
          <Field label="Signature" value="___________________________" />
          <Field label="Date Signed" value={null} />
        </div>

        {/* ── Legend ── */}
        <div className="bg-amber-50 border-t border-amber-200 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-amber-900">Pre-submission field key:</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-400" />
              <span className="text-amber-800">
                <strong>Amber</strong> — required org data missing; enter in NSGP Builder
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-50 border border-blue-300" />
              <span className="text-blue-800">
                <strong>Blue</strong> — complete once FEMA releases the NOFO (dates, districts)
              </span>
            </span>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            Submit through your State Administrative Agency (SAA) portal. Do not submit directly to FEMA.
          </p>
        </div>
      </div>
    </div>
  )
}
