// ─── Application Review Runner ────────────────────────────────────────────────
// Orchestrates all checks, computes scores, deduplicates findings,
// and generates the reviewer-style summary.
// Pure function — no DB access, no network calls.

import type { FilingSnapshot } from '@/actions/filings'

function generateId(): string {
  return `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}
import type {
  ApplicationReview,
  ReviewFinding,
  ReviewSummary,
  ReviewStatus,
} from './types'
import { checkCompleteness } from './checks/completeness'
import { checkThreatQuality } from './checks/threat-quality'
import { checkVulnerability } from './checks/vulnerability'
import { checkProjectAlignment } from './checks/project-alignment'
import { checkBudgetQuality } from './checks/budget'
import { checkImplementation } from './checks/implementation'
import { checkSustainment } from './checks/sustainment'
import { checkExportReadiness } from './checks/export-readiness'
import { computeScores, computeStatus } from './scorer'
import { REVIEW_STATUS_LABELS } from './types'

// ── Summary generator ─────────────────────────────────────────────────────────

function generateSummary(
  findings: ReviewFinding[],
  status: ReviewStatus,
  overallScore: number,
): ReviewSummary {
  const blockers = findings.filter((f) => f.severity === 'blocker' && !f.resolved)
  const warnings = findings.filter((f) => f.severity === 'warning' && !f.resolved)

  // Overall readiness narrative
  const statusLabel = REVIEW_STATUS_LABELS[status]
  let overallReadiness = ''
  if (status === 'incomplete') {
    overallReadiness = `This application has ${blockers.length} blocker${blockers.length !== 1 ? 's' : ''} that must be resolved before it can be submitted. The overall readiness score is ${overallScore}/100.`
  } else if (status === 'needs_review') {
    overallReadiness = `This application has no blocking errors, but several gaps need attention before it is competitive. The overall readiness score is ${overallScore}/100 — significant improvement is possible.`
  } else if (status === 'strong_draft') {
    overallReadiness = `This is a strong draft with an overall readiness score of ${overallScore}/100. Address the remaining warnings to maximize competitiveness.`
  } else {
    overallReadiness = `This application scores ${overallScore}/100 and is a strong submission-ready candidate. Review remaining suggestions to maximize the reviewer score.`
  }

  // Biggest blockers
  const biggestBlockers = blockers
    .slice(0, 5)
    .map((f) => `[${f.affectedSection}] ${f.title}`)

  // Top improvements (warnings first, then suggestions, limit 5)
  const topImprovements = [
    ...warnings.slice(0, 3),
    ...findings.filter((f) => f.severity === 'suggestion' && !f.resolved).slice(0, 2),
  ]
    .slice(0, 5)
    .map((f) => f.recommendedAction)

  // Estimated reviewer concerns
  const estimatedReviewerConcerns: string[] = []

  const threatFindings = findings.filter((f) => f.category === 'threat_quality' && !f.resolved)
  if (threatFindings.length > 0) {
    estimatedReviewerConcerns.push('Threat evidence may not meet the specificity standard required by FEMA — reviewers will look for dated incidents and law enforcement references.')
  }

  const budgetGeneric = findings.filter(
    (f) => f.id.startsWith('budget-generic-item') && !f.resolved,
  )
  if (budgetGeneric.length > 0) {
    estimatedReviewerConcerns.push(
      `${budgetGeneric.length} budget item(s) have generic names that will likely be questioned during budget review. FEMA requires specific manufacturer and model information.`,
    )
  }

  const implAutoGen = findings.filter(
    (f) => f.id.startsWith('implementation-auto-generated') && !f.resolved,
  )
  if (implAutoGen.length > 0) {
    estimatedReviewerConcerns.push(
      'Auto-generated implementation plans may read as template-based and non-specific, which is a common reason for lower scores on the implementation criterion.',
    )
  }

  const sustainAutoGen = findings.filter(
    (f) => f.id.startsWith('sustainment-auto-generated') && !f.resolved,
  )
  if (sustainAutoGen.length > 0) {
    estimatedReviewerConcerns.push(
      'Auto-generated sustainment plans that lack specific maintenance schedules, named responsible staff, and budget references are typically scored lower.',
    )
  }

  const vulnFindings = findings.filter(
    (f) => f.category === 'vulnerability' && !f.resolved,
  )
  if (vulnFindings.length > 0) {
    estimatedReviewerConcerns.push(
      'Vulnerability documentation may not fully explain why this specific site is at elevated risk. Reviewers want site-specific exposure analysis, not just threat-type descriptions.',
    )
  }

  // Suggested next action
  let suggestedNextAction = ''
  if (blockers.length > 0) {
    suggestedNextAction = `Resolve the ${blockers.length} blocker(s) first — particularly: ${blockers[0]?.title ?? 'see findings list'}.`
  } else if (warnings.length > 0) {
    const budgetWarnings = warnings.filter((f) => f.category === 'budget')
    if (budgetWarnings.length > 0) {
      suggestedNextAction = `Improve budget item specificity (${budgetWarnings.length} items flagged) and review any auto-generated narratives before exporting.`
    } else {
      suggestedNextAction = `Address the ${warnings.length} warning(s) — particularly threat documentation and vulnerability specificity — then generate a fresh draft for export.`
    }
  } else {
    suggestedNextAction = 'Review and accept/edit the suggested improvements, then generate a final draft for export and submission.'
  }

  return {
    overallReadiness,
    biggestBlockers,
    topImprovements,
    estimatedReviewerConcerns: estimatedReviewerConcerns.slice(0, 5),
    suggestedNextAction,
  }
}

// ── Main runner ───────────────────────────────────────────────────────────────

export function runApplicationReview(
  snapshot: FilingSnapshot,
  draftId: string,
): ApplicationReview {
  // Run all check categories
  const rawFindings: ReviewFinding[] = [
    ...checkCompleteness(snapshot),
    ...checkThreatQuality(snapshot),
    ...checkVulnerability(snapshot),
    ...checkProjectAlignment(snapshot),
    ...checkBudgetQuality(snapshot),
    ...checkImplementation(snapshot),
    ...checkSustainment(snapshot),
    ...checkExportReadiness(snapshot),
  ]

  // Deduplicate by ID (some checks may produce overlapping findings)
  const seenIds = new Set<string>()
  const findings = rawFindings.filter((f) => {
    if (seenIds.has(f.id)) return false
    seenIds.add(f.id)
    return true
  })

  // Compute scores
  const scores = computeScores(snapshot)

  // Tally
  const blockerCount = findings.filter((f) => f.severity === 'blocker').length
  const warningCount = findings.filter((f) => f.severity === 'warning').length
  const suggestionCount = findings.filter((f) => f.severity === 'suggestion').length
  const resolvedCount = findings.filter((f) => f.resolved).length
  const unresolvedBlockers = findings.filter(
    (f) => f.severity === 'blocker' && !f.resolved,
  ).length

  const status = computeStatus(scores, unresolvedBlockers)
  const summary = generateSummary(findings, status, scores.overall)

  return {
    id: generateId(),
    draftId,
    createdAt: new Date().toISOString(),
    reviewStatus: status,
    scores,
    findings,
    summary,
    totalFindings: findings.length,
    blockerCount,
    warningCount,
    suggestionCount,
    resolvedCount,
    unresolvedBlockers,
  }
}

// ── Fix application helper ────────────────────────────────────────────────────
// Applies an accepted proposed fix to the snapshot, returning the patched snapshot.
// GUARDRAIL: never invents facts — only applies text the user has reviewed and accepted.

export function applyFixToSnapshot(
  snapshot: FilingSnapshot,
  targetPath: string,
  proposedText: string,
): FilingSnapshot {
  // Parse path format: "projects[proj-id].budgetItems[item-id].itemName"
  // or "organization.contactName"

  const snap = JSON.parse(JSON.stringify(snapshot)) as FilingSnapshot // deep clone

  // Match: projects[<id>].budgetItems[<id>].<field>
  const budgetItemMatch = targetPath.match(
    /^projects\[([^\]]+)\]\.budgetItems\[([^\]]+)\]\.(\w+)$/,
  )
  if (budgetItemMatch) {
    const [, projId, itemId, field] = budgetItemMatch
    const project = snap.projects.find((p) => p.id === projId)
    if (project) {
      const item = project.budgetItems.find((b) => b.id === itemId)
      if (item) {
        ;(item as Record<string, unknown>)[field] = proposedText
      }
    }
    return snap
  }

  // Match: projects[<id>].<field>
  const projectMatch = targetPath.match(/^projects\[([^\]]+)\]\.(\w+)$/)
  if (projectMatch) {
    const [, projId, field] = projectMatch
    const project = snap.projects.find((p) => p.id === projId)
    if (project) {
      ;(project as Record<string, unknown>)[field] = proposedText
    }
    return snap
  }

  // Match: organization.<field>
  const orgMatch = targetPath.match(/^organization\.(\w+)$/)
  if (orgMatch) {
    const [, field] = orgMatch
    ;(snap.organization as Record<string, unknown>)[field] = proposedText
    return snap
  }

  // Match: site.<field>
  const siteMatch = targetPath.match(/^site\.(\w+)$/)
  if (siteMatch) {
    const [, field] = siteMatch
    if (snap.site) {
      ;(snap.site as Record<string, unknown>)[field] = proposedText
    }
    return snap
  }

  // Unknown path — return unchanged (safe fallback)
  return snap
}
