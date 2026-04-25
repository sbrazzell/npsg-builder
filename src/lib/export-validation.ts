import type { FilingSnapshot } from '@/actions/filings'

// ─── Types ────────────────────────────────────────────────────────────────────

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: IssueSeverity
  code: string
  /** Human-readable field label */
  field: string
  message: string
  /** Optional reference, e.g. project title */
  context?: string
}

export type DocumentStatus = 'incomplete' | 'review-ready' | 'submission-ready'

export interface ValidationResult {
  issues: ValidationIssue[]
  status: DocumentStatus
  errorCount: number
  warningCount: number
}

// ─── Placeholder patterns ─────────────────────────────────────────────────────
// These are strings the SF-424 template hard-codes when the system has no data.
// Any field whose value matches one of these is "blank" from FEMA's perspective.

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^\(enter district/i,
  /^enter district/i,
  /^\(enter when nofo/i,
  /^\(typically \d+ months/i,
  /^\(enter title\)/i,
  /^\(complete at submission\)/i,
  /^complete at submission/i,
  /^assigned upon award/i,
  /^new application/i,
  /required — authorized signatory/i,
  /___+/, // signature line underscores
]

export function isPlaceholder(value: string | null | undefined): boolean {
  if (!value || value.trim() === '') return true
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value.trim()))
}

// ─── Generic budget-item patterns ─────────────────────────────────────────────
// Item names that are too vague to survive FEMA/SAA grant review.

const GENERIC_ITEM_PATTERNS: RegExp[] = [
  /^security equipment\.?$/i,
  /^equipment\.?$/i,
  /^camera(s)?\.?$/i,
  /^door hardware\.?$/i,
  /^access control\.?$/i,
  /^lock(s)?\.?$/i,
  /^fence(s|ing)?\.?$/i,
  /^lighting\.?$/i,
  /^software\.?$/i,
  /^hardware\.?$/i,
  /^miscellaneous\.?$/i,
  /^supplies\.?$/i,
  /^other\.?$/i,
  /^security system\.?$/i,
]

export function isGenericItemName(name: string): boolean {
  return GENERIC_ITEM_PATTERNS.some((re) => re.test(name.trim()))
}

// ─── SF-424 field definitions ─────────────────────────────────────────────────
// Maps the logical field name to how the SF-424 form template fills it so we can
// detect unresolved placeholders without duplicating rendering logic.

interface SF424Field {
  code: string
  field: string
  /** Resolves the expected rendered string from snapshot; null means "always placeholder" */
  getValue: (s: FilingSnapshot) => string | null | undefined
}

const SF424_CHECKED_FIELDS: SF424Field[] = [
  {
    code: 'SF424_NO_EIN',
    field: 'Employer / Taxpayer ID (EIN)',
    getValue: (s) => s.organization.einOrTaxId,
  },
  {
    code: 'SF424_NO_CONTACT_NAME',
    field: 'Authorized Representative Name',
    getValue: (s) => s.organization.contactName,
  },
  {
    code: 'SF424_NO_CONTACT_EMAIL',
    field: 'Contact Email',
    getValue: (s) => s.organization.contactEmail,
  },
  {
    code: 'SF424_NO_ADDRESS',
    field: 'Mailing Address',
    getValue: (s) =>
      [s.organization.address, s.organization.city, s.organization.state, s.organization.zip]
        .filter(Boolean)
        .join(', '),
  },
  // These are always placeholder in the current system — NOFO-dependent
  {
    code: 'SF424_PLACEHOLDER_DISTRICT_APP',
    field: 'Congressional District of Applicant',
    getValue: () => null, // always a placeholder
  },
  {
    code: 'SF424_PLACEHOLDER_DISTRICT_PROJ',
    field: 'Congressional District of Project',
    getValue: () => null,
  },
  {
    code: 'SF424_PLACEHOLDER_START_DATE',
    field: 'Proposed Start Date',
    getValue: () => null,
  },
  {
    code: 'SF424_PLACEHOLDER_END_DATE',
    field: 'Proposed End Date',
    getValue: () => null,
  },
  {
    code: 'SF424_PLACEHOLDER_REP_TITLE',
    field: 'Authorized Representative Title',
    getValue: () => null,
  },
  {
    code: 'SF424_PLACEHOLDER_SIG_DATE',
    field: 'Authorized Representative Signature Date',
    getValue: () => null,
  },
]

// ─── Project required sections ────────────────────────────────────────────────

interface ProjectSection {
  code: string
  label: string
  getValue: (p: FilingSnapshot['projects'][number]) => string | null | undefined
}

const PROJECT_REQUIRED_SECTIONS: ProjectSection[] = [
  { code: 'PROJ_NO_PROBLEM', label: 'Problem Statement', getValue: (p) => p.problemStatement },
  { code: 'PROJ_NO_SOLUTION', label: 'Proposed Solution', getValue: (p) => p.proposedSolution },
  {
    code: 'PROJ_NO_RISK_RATIONALE',
    label: 'Risk Reduction Rationale',
    getValue: (p) => p.riskReductionRationale,
  },
  {
    code: 'PROJ_NO_IMPLEMENTATION',
    label: 'Implementation Plan',
    getValue: (p) => p.implementationNotes,
  },
  // Timeline and Sustainment are not stored in the DB yet — always flagged
  { code: 'PROJ_NO_TIMELINE', label: 'Estimated Timeline / Milestones', getValue: () => null },
  { code: 'PROJ_NO_SUSTAINMENT', label: 'Sustainment / Maintenance Plan', getValue: () => null },
]

// ─── Main validator ───────────────────────────────────────────────────────────

export function validateSnapshot(snapshot: FilingSnapshot): ValidationResult {
  const issues: ValidationIssue[] = []

  // ── 1. SF-424 field checks ────────────────────────────────────────────────
  for (const f of SF424_CHECKED_FIELDS) {
    const value = f.getValue(snapshot)
    if (isPlaceholder(value)) {
      // NOFO-dependent fields are 'info' (expected gaps); org data fields are 'error'
      const isNofoDependent = [
        'SF424_PLACEHOLDER_DISTRICT_APP',
        'SF424_PLACEHOLDER_DISTRICT_PROJ',
        'SF424_PLACEHOLDER_START_DATE',
        'SF424_PLACEHOLDER_END_DATE',
        'SF424_PLACEHOLDER_REP_TITLE',
        'SF424_PLACEHOLDER_SIG_DATE',
      ].includes(f.code)
      issues.push({
        severity: isNofoDependent ? 'info' : 'error',
        code: f.code,
        field: f.field,
        message: isNofoDependent
          ? `${f.field} — complete once FEMA releases the NOFO`
          : `${f.field} is blank or missing`,
      })
    }
  }

  // ── 2. Projects ───────────────────────────────────────────────────────────
  if (snapshot.projects.length === 0) {
    issues.push({
      severity: 'error',
      code: 'NO_PROJECTS',
      field: 'Projects',
      message: 'No project proposals have been added',
    })
  }

  for (const project of snapshot.projects) {
    for (const section of PROJECT_REQUIRED_SECTIONS) {
      const value = section.getValue(project)
      if (!value || value.trim() === '') {
        // Timeline and Sustainment are always info (not yet captured in system)
        const isSystemGap = ['PROJ_NO_TIMELINE', 'PROJ_NO_SUSTAINMENT'].includes(section.code)
        issues.push({
          severity: isSystemGap ? 'info' : 'warning',
          code: section.code,
          field: section.label,
          message: isSystemGap
            ? `${section.label} — not captured by this tool; complete manually before submission`
            : `${section.label} is blank for this project`,
          context: project.title,
        })
      }
    }

    // No budget items
    if (project.budgetItems.length === 0) {
      issues.push({
        severity: 'warning',
        code: 'PROJ_NO_BUDGET_ITEMS',
        field: 'Budget Items',
        message: 'No budget items entered for this project',
        context: project.title,
      })
    }

    // Generic item names
    for (const item of project.budgetItems) {
      if (isGenericItemName(item.itemName)) {
        issues.push({
          severity: 'warning',
          code: 'BUDGET_GENERIC_ITEM',
          field: 'Budget Item Name',
          message: `"${item.itemName}" is too generic — FEMA reviewers require specific descriptions (e.g. "HID multiClass card reader, model SE325")`,
          context: project.title,
        })
      }
    }
  }

  // ── 3. Org-level checks ───────────────────────────────────────────────────
  if (!snapshot.organization.denomination) {
    issues.push({
      severity: 'info',
      code: 'ORG_NO_DENOMINATION',
      field: 'Denomination / Affiliation',
      message: 'Denomination or religious affiliation is blank — FEMA uses this to establish nonprofit mission context',
    })
  }

  // ── 4. Threats ────────────────────────────────────────────────────────────
  if (snapshot.threats.length === 0) {
    issues.push({
      severity: 'error',
      code: 'NO_THREATS',
      field: 'Threat Assessments',
      message: 'No threat assessments have been entered — the IJ requires documented threats',
    })
  }

  // ── 5. Budget math integrity ──────────────────────────────────────────────
  const computedTotal = snapshot.projects.reduce(
    (sum, p) => sum + p.budgetItems.reduce((s, b) => s + b.totalCost, 0),
    0,
  )
  const snapshotTotal = snapshot.totalBudget
  if (Math.abs(computedTotal - snapshotTotal) > 0.01) {
    issues.push({
      severity: 'error',
      code: 'BUDGET_MATH_MISMATCH',
      field: 'Total Budget',
      message: `Budget total mismatch: snapshot reports ${formatCurrencyRaw(snapshotTotal)} but line items sum to ${formatCurrencyRaw(computedTotal)}`,
    })
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length

  let status: DocumentStatus
  if (errorCount > 0) {
    status = 'incomplete'
  } else if (warningCount > 0) {
    status = 'review-ready'
  } else {
    // info-only issues are expected NOFO gaps — still not fully submission-ready
    const infoOnly = issues.every((i) => i.severity === 'info')
    status = infoOnly && issues.length > 0 ? 'review-ready' : 'submission-ready'
  }

  return { issues, status, errorCount, warningCount }
}

// ─── Status label helpers ─────────────────────────────────────────────────────

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  incomplete: 'Draft — Incomplete',
  'review-ready': 'Draft — Ready for Review',
  'submission-ready': 'Submission-Ready Export',
}

export const STATUS_COLORS: Record<DocumentStatus, { bg: string; text: string; border: string }> = {
  incomplete: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  'review-ready': { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
  'submission-ready': { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatCurrencyRaw(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
