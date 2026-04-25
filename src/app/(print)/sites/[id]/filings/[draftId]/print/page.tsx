export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FormSF424 } from '@/app/(app)/sites/[id]/filings/[draftId]/form-sf424'
import { FormInvestmentJustification } from '@/app/(app)/sites/[id]/filings/[draftId]/form-investment-justification'
import { FormBudget } from '@/app/(app)/sites/[id]/filings/[draftId]/form-budget'
import { FormReadinessChecklist } from './form-readiness-checklist'
import type { FilingSnapshot } from '@/actions/filings'
import { validateSnapshot, STATUS_LABELS } from '@/lib/export-validation'
import { PrintTrigger } from './print-trigger'

export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string; draftId: string }>
}) {
  const { id, draftId } = await params

  const [facility, draft] = await Promise.all([
    prisma.site.findUnique({ where: { id }, include: { organization: true } }),
    prisma.applicationDraft.findUnique({ where: { id: draftId } }),
  ])

  if (!facility || !draft || draft.siteId !== id) notFound()

  const snapshot: FilingSnapshot = JSON.parse(draft.snapshotJson)

  // Backfill site if snapshot was created before site was included
  if (!snapshot.site) {
    snapshot.site = {
      id: facility.id,
      siteName: facility.siteName,
      address: facility.address ?? null,
      occupancyNotes: (facility as Record<string, unknown>).occupancyNotes as string ?? null,
      populationServed: (facility as Record<string, unknown>).populationServed as string ?? null,
      daysHoursOfOperation: null,
      childrensAreasNotes: null,
      parkingLotNotes: null,
      surroundingAreaNotes: null,
      publicAccessNotes: null,
      knownSecurityConcerns: null,
      notes: null,
      lawEnforcementAgency: null,
      lawEnforcementContactName: null,
      lawEnforcementContactDate: null,
      lawEnforcementResponseDate: null,
      lawEnforcementFindings: null,
    }
  }

  // Run validation — results flow to both the status badge and the checklist page
  const validation = validateSnapshot(snapshot)
  const statusLabel = STATUS_LABELS[validation.status]

  const capturedDate = new Date(snapshot.capturedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <>
      {/* Screen toolbar + print-only header/footer */}
      <PrintTrigger
        title={draft.title}
        capturedDate={capturedDate}
        statusLabel={statusLabel}
        status={validation.status}
      />

      {/* ── Form content ── */}
      <div className="p-8 space-y-12 max-w-[900px] mx-auto print-content">

        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">
            Form 1 of 4 — SF-424
          </div>
          <FormSF424 snapshot={snapshot} />
        </div>

        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">
            Form 2 of 4 — Investment Justification
          </div>
          <FormInvestmentJustification snapshot={snapshot} />
        </div>

        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">
            Form 3 of 4 — Budget Worksheet
          </div>
          <FormBudget snapshot={snapshot} />
        </div>

        <div style={{ pageBreakBefore: 'always' }}>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">
            Form 4 of 4 — Submission Readiness Checklist
          </div>
          <FormReadinessChecklist snapshot={snapshot} validation={validation} />
        </div>

      </div>

      <style>{`
        /* Header/footer hidden on screen, shown only when printing */
        .print-page-header,
        .print-page-footer {
          display: none;
        }

        @media print {
          .no-print-ui { display: none !important; }

          @page { margin: 0.75in 0.7in; }

          body { background: white !important; }

          /* Audit header — fixed so it repeats on every printed page */
          .print-page-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            padding: 5pt 28pt;
            font-size: 7.5pt;
            font-family: ui-monospace, monospace;
            letter-spacing: 0.02em;
            color: #666;
            border-bottom: 0.5pt solid #ccc;
            background: white;
            z-index: 9999;
          }

          .print-audit-title {
            font-weight: 600;
            color: #444;
          }

          /* Audit footer — fixed so it repeats on every printed page */
          .print-page-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 5pt 28pt;
            font-size: 7.5pt;
            font-family: ui-monospace, monospace;
            letter-spacing: 0.02em;
            color: #888;
            border-top: 0.5pt solid #ccc;
            background: white;
            z-index: 9999;
          }

          /* Push content down/up so it doesn't slide under the fixed bars */
          .print-content {
            padding-top: 40pt;
            padding-bottom: 40pt;
          }

          /* ── Pagination: table rows ───────────────────────────── */
          /* Repeat table header row at the top of each new page */
          thead {
            display: table-header-group;
          }

          /* Prevent individual table rows from splitting across pages */
          tbody tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* ── Pagination: section headings ─────────────────────── */
          /* Keep section headings glued to the first content block  */
          .ij-section-heading {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* Keep project card headers glued to the first narrative card */
          .project-card-header {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* Keep individual project narrative cards together */
          .project-section-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Give ij-sections a small top margin so they breathe when starting
             near the top of a printed page (below the fixed header bar) */
          .ij-section {
            margin-top: 6pt;
          }

          /* Checklist rows and warning boxes should not split */
          .checklist-row,
          .warning-box {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* ── Budget form headings & project cards ─────────── */
          /* Keep section headings (A/B/C/D) glued to first content below */
          .budget-section-heading {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* Keep project header bar glued to the budget table below */
          .budget-project-header {
            break-after: avoid;
            page-break-after: avoid;
          }
        }
      `}</style>
    </>
  )
}
