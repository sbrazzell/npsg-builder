// ─── Application Review — Core Types ─────────────────────────────────────────
// All types for the agentic review workflow.  Pure data; no framework deps.

// ── Status ───────────────────────────────────────────────────────────────────

export type ReviewStatus =
  | 'incomplete'               // blockers present
  | 'needs_review'             // no blockers, overall < 50
  | 'strong_draft'             // no blockers, 50-74
  | 'submission_ready_candidate' // no blockers, overall ≥ 75

// ── Severity ─────────────────────────────────────────────────────────────────

export type FindingSeverity = 'blocker' | 'warning' | 'suggestion'

// ── Category ─────────────────────────────────────────────────────────────────

export type FindingCategory =
  | 'completeness'
  | 'threat_quality'
  | 'vulnerability'
  | 'project_alignment'
  | 'budget'
  | 'implementation'
  | 'sustainment'
  | 'export_readiness'

// ── Guardrail tags — reasons why a fix cannot invent facts ───────────────────

export type GuardrailTag =
  | 'no_invented_incidents'
  | 'no_invented_quotes'
  | 'no_invented_certifications'
  | 'evidence_needed'
  | 'user_must_confirm'

// ── Proposed fix — attached to canAutoFix findings ───────────────────────────

export type FixType =
  | 'text_replacement'     // replace a narrative / field value
  | 'budget_item_rename'   // rename a budget item (requires user edit)
  | 'field_patch'          // set a scalar field

export interface ProposedFix {
  type: FixType
  /** Dot-notation path into the snapshot.
   *  e.g. "organization.contactName"
   *       "projects[proj-1].implementationNarrative"
   *       "projects[proj-1].budgetItems[bi-1].itemName" */
  targetPath: string
  original: string
  /** Fully-formed replacement value. For budget_item_rename, this may be a
   *  template the user is expected to edit before accepting. */
  proposed: string
  /** If true, the proposed text must not be applied without explicit user
   *  review — a fact or claim is at stake that the tool cannot verify. */
  requiresEvidenceConfirmation: boolean
  evidenceNote?: string
  guardrailTags: GuardrailTag[]
}

// ── Individual finding ────────────────────────────────────────────────────────

export interface ReviewFinding {
  id: string                 // deterministic slug, e.g. "budget-generic-item-bi-1"
  severity: FindingSeverity
  category: FindingCategory
  title: string
  explanation: string
  affectedSection: string    // human-readable section label
  affectedEntityId?: string  // project id, threat id, budget item id
  affectedEntityLabel?: string
  recommendedAction: string
  canAutoFix: boolean
  proposedFix?: ProposedFix
  resolved: boolean
  resolvedAt?: string
  rejected: boolean          // user explicitly dismissed this finding
}

// ── Scores (each 0-100) ───────────────────────────────────────────────────────

export interface ReviewScores {
  overall: number
  threat_evidence: number
  vulnerability_specificity: number
  project_alignment: number
  budget_quality: number
  implementation_feasibility: number
  sustainment_quality: number
  attachment_readiness: number
}

// ── Reviewer summary ──────────────────────────────────────────────────────────

export interface ReviewSummary {
  overallReadiness: string
  biggestBlockers: string[]
  topImprovements: string[]
  estimatedReviewerConcerns: string[]
  suggestedNextAction: string
}

// ── Full review result ────────────────────────────────────────────────────────

export interface ApplicationReview {
  id: string
  draftId: string
  createdAt: string
  reviewStatus: ReviewStatus
  scores: ReviewScores
  findings: ReviewFinding[]
  summary: ReviewSummary
  totalFindings: number
  blockerCount: number
  warningCount: number
  suggestionCount: number
  resolvedCount: number
  unresolvedBlockers: number
}

// ── Stored history record (lightweight, no full reviewJson) ───────────────────

export interface ReviewHistoryEntry {
  id: string
  draftId: string
  createdAt: string
  overallScore: number
  reviewStatus: ReviewStatus
  totalFindings: number
  blockerCount: number
  resolvedCount: number
  unresolvedBlockers: number
}

// ── Status display helpers ────────────────────────────────────────────────────

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  incomplete: 'Incomplete — Blockers Present',
  needs_review: 'Needs Review',
  strong_draft: 'Strong Draft',
  submission_ready_candidate: 'Submission-Ready Candidate',
}

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, { bg: string; text: string; border: string }> = {
  incomplete: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
  needs_review: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  strong_draft: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  submission_ready_candidate: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
}

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  completeness: 'Completeness',
  threat_quality: 'Threat Quality',
  vulnerability: 'Vulnerability',
  project_alignment: 'Project Alignment',
  budget: 'Budget',
  implementation: 'Implementation',
  sustainment: 'Sustainment',
  export_readiness: 'Export Readiness',
}

export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  blocker: 'Blocker',
  warning: 'Warning',
  suggestion: 'Suggestion',
}
