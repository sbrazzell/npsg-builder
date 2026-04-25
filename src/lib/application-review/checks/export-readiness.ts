// ─── Export Readiness Checks ──────────────────────────────────────────────────
// Attachment checklist and submission-gate items that the tool cannot verify
// but must remind the applicant about.

import type { FilingSnapshot } from '@/actions/filings'
import type { ReviewFinding } from '../types'

export function checkExportReadiness(snapshot: FilingSnapshot): ReviewFinding[] {
  const findings: ReviewFinding[] = []

  // ── SF-424 fields that require human action before submission ─────────────

  findings.push({
    id: 'export-sf424-authorized-rep-title',
    severity: 'warning',
    category: 'export_readiness',
    title: 'Authorized Representative title must be handwritten at submission',
    explanation:
      'The SF-424 requires the authorized representative\'s title. NSGP Builder does not capture this field — it must be written in on the final signed form.',
    affectedSection: 'SF-424 — Authorized Representative',
    recommendedAction: 'When completing the final SF-424, write in the authorized representative\'s official title (e.g., "Executive Director", "Senior Pastor", "Board President").',
    canAutoFix: false,
    resolved: false,
    rejected: false,
  })

  findings.push({
    id: 'export-sf424-signature-date',
    severity: 'warning',
    category: 'export_readiness',
    title: 'Signature date must be added at submission',
    explanation:
      'The SF-424 signature date cannot be pre-filled — it must match the actual date of submission. This is a common submission error that causes delays.',
    affectedSection: 'SF-424 — Authorized Representative Signature',
    recommendedAction: 'Do not pre-fill the signature date. Sign and date the SF-424 on the day you submit the application package.',
    canAutoFix: false,
    resolved: false,
    rejected: false,
  })

  // ── Required attachments (cannot be verified, only prompted) ─────────────

  findings.push({
    id: 'export-attachment-501c3',
    severity: 'suggestion',
    category: 'export_readiness',
    title: 'IRS 501(c)(3) determination letter — attachment required',
    explanation:
      'Most SAAs require proof of nonprofit tax-exempt status. Your IRS 501(c)(3) determination letter must be attached to the application package. Evidence needed — user must confirm.',
    affectedSection: 'Attachments Checklist',
    recommendedAction: 'Locate your IRS 501(c)(3) determination letter and include it in the application package.',
    canAutoFix: false,
    resolved: false,
    rejected: false,
  })

  findings.push({
    id: 'export-attachment-sam-registration',
    severity: 'suggestion',
    category: 'export_readiness',
    title: 'SAM.gov registration must be active at time of submission',
    explanation:
      'All federal grant applicants must have an active registration in SAM.gov (System for Award Management). Registration must not be expired at submission. Evidence needed — user must confirm.',
    affectedSection: 'Attachments Checklist',
    recommendedAction: 'Verify your SAM.gov registration is active at sam.gov. Registration renewal takes 2-4 weeks — check early.',
    canAutoFix: false,
    resolved: false,
    rejected: false,
  })

  findings.push({
    id: 'export-attachment-board-resolution',
    severity: 'suggestion',
    category: 'export_readiness',
    title: 'Board resolution or letter of authorization — may be required',
    explanation:
      'Some SAAs require a board resolution or letter authorizing the authorized representative to apply on behalf of the organization. Check your SAA\'s specific requirements. Evidence needed — user must confirm.',
    affectedSection: 'Attachments Checklist',
    recommendedAction: 'Check your state\'s NSGP NOFO requirements. If a board resolution is required, obtain one signed by the full board before submission.',
    canAutoFix: false,
    resolved: false,
    rejected: false,
  })

  findings.push({
    id: 'export-attachment-site-plan',
    severity: 'suggestion',
    category: 'export_readiness',
    title: 'Site plan or floor plan — typically required',
    explanation:
      'FEMA and SAAs often require a site plan or floor plan showing the property layout and the locations where security improvements will be installed. Evidence needed — user must confirm.',
    affectedSection: 'Attachments Checklist',
    recommendedAction: 'Prepare a site plan or floor plan annotated to show where each proposed security measure will be installed.',
    canAutoFix: false,
    resolved: false,
    rejected: false,
  })

  findings.push({
    id: 'export-attachment-vendor-quotes',
    severity: 'suggestion',
    category: 'export_readiness',
    title: 'Vendor quotes for major equipment — strengthen the budget',
    explanation:
      'While not always required, attaching vendor quotes for major equipment purchases significantly strengthens the budget justification. Reviewers look for cost reasonableness. Evidence needed — user must confirm.',
    affectedSection: 'Attachments Checklist — Budget Support',
    recommendedAction: 'Obtain and attach written vendor quotes for all major equipment items (typically items over $5,000). Include quote date, vendor name, and itemized pricing.',
    canAutoFix: false,
    resolved: false,
    rejected: false,
  })

  // ── Congressional district reminder ───────────────────────────────────────

  findings.push({
    id: 'export-congressional-district',
    severity: 'warning',
    category: 'export_readiness',
    title: 'Congressional districts must be completed once NOFO is released',
    explanation:
      'SF-424 fields 5c (Congressional District of Applicant) and 5d (Congressional District of Project) require specific formatting that FEMA specifies in the NOFO. Do not guess — wait for NOFO guidance.',
    affectedSection: 'SF-424 — Congressional Districts',
    recommendedAction: 'Once FEMA releases the NSGP NOFO, look up your congressional district numbers and enter them in the SF-424 exactly as instructed.',
    canAutoFix: false,
    resolved: false,
    rejected: false,
  })

  // ── Check if any generated sections are still inferred ────────────────────

  const inferredProjects = snapshot.projects.filter(
    (p) =>
      p.implementationSource === 'inferred' ||
      p.timelineSource === 'inferred' ||
      p.sustainmentSource === 'inferred',
  )

  if (inferredProjects.length > 0) {
    findings.push({
      id: 'export-auto-generated-sections-unreviewed',
      severity: 'suggestion',
      category: 'export_readiness',
      title: `${inferredProjects.length} project(s) have auto-generated narratives that have not been customized`,
      explanation:
        `${inferredProjects.map((p) => p.title).join(', ')} ${inferredProjects.length === 1 ? 'has' : 'have'} one or more narratives (implementation, timeline, or sustainment) that were auto-generated and have not been reviewed or customized. Submitting generic, template-based narratives is a common cause of lower scores.`,
      affectedSection: 'Investment Justification — Auto-Generated Narratives',
      recommendedAction: 'Review each auto-generated narrative and customize it with site-specific, vendor-specific, and timeline-specific details.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  return findings
}
