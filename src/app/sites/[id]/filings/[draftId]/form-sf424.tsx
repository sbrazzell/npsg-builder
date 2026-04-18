import type { FilingSnapshot } from '@/actions/filings'
import { formatCurrency } from '@/lib/scoring'

const CFDA = '97.008'
const FEDERAL_AGENCY = 'Department of Homeland Security / Federal Emergency Management Agency'
const PROGRAM_TITLE = 'Nonprofit Security Grant Program (NSGP)'

function Field({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={`border border-gray-400 ${wide ? 'col-span-2' : ''}`}>
      <div className="bg-gray-100 px-2 py-0.5 border-b border-gray-400">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
      </div>
      <div className="px-2 py-1.5 min-h-[28px]">
        <span className="text-sm">{value || ''}</span>
      </div>
    </div>
  )
}

function SectionHeader({ number, title }: { number?: string; title: string }) {
  return (
    <div className="col-span-2 bg-slate-800 text-white px-3 py-1.5 flex items-center gap-3">
      {number && <span className="text-xs font-bold bg-white text-slate-800 rounded px-1.5 py-0.5">{number}</span>}
      <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
    </div>
  )
}

export function FormSF424({ snapshot }: { snapshot: FilingSnapshot }) {
  const { organization: org, site, projects, totalBudget } = snapshot
  const orgAddress = [org.address, org.city, org.state, org.zip].filter(Boolean).join(', ')
  const today = new Date(snapshot.capturedAt).toLocaleDateString('en-US')
  const projectTitles = projects.map((p) => p.title).join('; ')

  return (
    <div className="font-sans text-gray-900 bg-white" id="form-sf424">
      {/* Header */}
      <div className="border-2 border-gray-800 mb-0">
        <div className="bg-slate-800 text-white px-4 py-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">OMB Number: 4040-0004</p>
            <p className="text-xl font-bold">Application for Federal Assistance (SF-424)</p>
            <p className="text-sm text-slate-300 mt-0.5">Nonprofit Security Grant Program · CFDA {CFDA}</p>
          </div>
          <div className="text-right text-xs text-slate-400 shrink-0">
            <p>Expiration Date: 02/28/2026</p>
            <p className="mt-1">Version: Pre-Submission Draft</p>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 gap-0.5 bg-gray-200">
          <SectionHeader number="1" title="Submission Type" />
          <Field label="Type of Submission" value="Application" />
          <Field label="Type of Application" value="New" />

          <SectionHeader number="2" title="Date & Identifier" />
          <Field label="Date Received" value={today} />
          <Field label="Applicant Identifier (EIN)" value={org.einOrTaxId || 'REQUIRED'} />

          <SectionHeader number="3" title="Federal Funding Information" />
          <Field label="Federal Entity Identifier" value="(Assigned upon award)" />
          <Field label="Federal Award Identifier" value="(New application)" />
          <Field label="CFDA Number" value={CFDA} />
          <Field label="CFDA Title" value={PROGRAM_TITLE} />

          <SectionHeader number="4" title="Applicant Information" />
          <Field label="Legal Name of Applicant Organization" value={org.name} wide />
          <Field label="Organization Type" value="Non-profit Organization" />
          <Field label="Employer / Taxpayer ID (EIN)" value={org.einOrTaxId || 'REQUIRED'} />
          <Field label="Organizational Unit / Denomination" value={org.denomination || ''} wide />
          <Field label="Mailing Address" value={orgAddress || 'REQUIRED'} wide />
          <Field label="Name of Primary Contact" value={org.contactName || ''} />
          <Field label="Contact Phone" value={org.contactPhone || ''} />
          <Field label="Contact Email" value={org.contactEmail || ''} wide />

          <SectionHeader number="5" title="Project / Site Information" />
          <Field label="Federal Agency" value={FEDERAL_AGENCY} wide />
          <Field label="Program Title" value={PROGRAM_TITLE} wide />
          <Field
            label="Descriptive Title of Applicant's Project"
            value={`Security enhancements for ${site.siteName}: ${projectTitles || 'Physical security improvements'}`}
            wide
          />
          <Field label="Project Location — Site Name" value={site.siteName} />
          <Field label="Project Location — Address" value={site.address || org.address || ''} />
          <Field label="Areas Affected by Project" value={[org.city, org.state].filter(Boolean).join(', ')} />
          <Field label="Congressional District of Applicant" value="(Enter district — required at submission)" />
          <Field label="Congressional District of Project" value="(Enter district — required at submission)" />

          <SectionHeader number="6" title="Proposed Project Dates" />
          <Field label="Proposed Start Date" value="(Enter when NOFO announces period of performance)" />
          <Field label="Proposed End Date" value="(Typically 36 months from award)" />

          <SectionHeader number="7" title="Estimated Funding ($)" />
          <Field label="a. Federal" value={formatCurrency(totalBudget)} />
          <Field label="b. Applicant" value="$0.00" />
          <Field label="c. State" value="$0.00" />
          <Field label="d. Local" value="$0.00" />
          <Field label="e. Other" value="$0.00" />
          <Field label="f. Program Income" value="$0.00" />
          <Field label="g. TOTAL" value={formatCurrency(totalBudget)} />

          <SectionHeader number="8" title="Compliance & Certifications" />
          <Field label="Is application subject to state executive order 12372 review?" value="No" />
          <Field label="Is the applicant delinquent on any federal debt?" value="No" />

          <SectionHeader number="9" title="Authorized Organization Representative" />
          <Field label="Name" value={org.contactName || 'REQUIRED — authorized signatory'} />
          <Field label="Title" value="(Enter title)" />
          <Field label="Phone" value={org.contactPhone || ''} />
          <Field label="Email" value={org.contactEmail || ''} />
          <Field label="Signature" value="___________________________" />
          <Field label="Date Signed" value="(Complete at submission)" />
        </div>

        <div className="bg-amber-50 border-t border-amber-200 px-4 py-2">
          <p className="text-xs text-amber-800">
            <strong>Pre-submission draft.</strong> Fields marked REQUIRED must be completed before submission. Congressional district and project dates will be filled in once FEMA releases the NOFO. Submit through your State Administrative Agency (SAA) portal.
          </p>
        </div>
      </div>
    </div>
  )
}
