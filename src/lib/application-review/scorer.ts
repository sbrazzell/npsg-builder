// ─── Scoring Engine ───────────────────────────────────────────────────────────
// Computes sub-scores and the weighted overall score from the snapshot.
// Runs independently of findings (pure computation).

import type { FilingSnapshot } from '@/actions/filings'
import type { ReviewScores, ReviewStatus } from './types'
import { isGenericItemName } from '@/lib/export-validation'
import { detectVagueTerms, mentionsMaintenance, mentionsOwnership } from './utils'

// ── Sub-scorers (each returns 0-100) ─────────────────────────────────────────

function scoreThreatEvidence(snapshot: FilingSnapshot): number {
  const { threats, site } = snapshot
  if (threats.length === 0) return 0

  let pts = 0

  // Threats exist (25)
  pts += 25

  // At least one high/critical (25)
  if (threats.some((t) => t.riskLevel === 'high' || t.riskLevel === 'critical')) pts += 25

  // ≥50% have incident history (25)
  const withHistory = threats.filter((t) => t.incidentHistory?.trim())
  if (withHistory.length / threats.length >= 0.5) pts += 25
  else pts += Math.round((withHistory.length / threats.length) * 25)

  // Law enforcement contact documented (25)
  if (site?.lawEnforcementAgency?.trim()) pts += 25
  else if (threats.some((t) => t.sourceAgency?.trim())) pts += 10 // partial credit

  return Math.min(100, pts)
}

function scoreVulnerabilitySpecificity(snapshot: FilingSnapshot): number {
  const { securityMeasures, threats, site, projects } = snapshot
  let pts = 0

  // Security measures documented (20)
  if (securityMeasures.length > 0) {
    pts += 20
    // Gaps documented on measures (10)
    const withGaps = securityMeasures.filter((m) => m.gapsRemaining?.trim())
    pts += Math.round((withGaps.length / securityMeasures.length) * 10)
  }

  // Population served (15)
  if (site?.populationServed?.trim() && site.populationServed.trim().length >= 40) pts += 15
  else if (site?.populationServed?.trim()) pts += 7

  // ≥50% threats have vulnerability notes (25)
  if (threats.length > 0) {
    const withVuln = threats.filter((t) => t.vulnerabilityNotes?.trim())
    pts += Math.round((withVuln.length / threats.length) * 25)
  }

  // Known security concerns (15)
  if (site?.knownSecurityConcerns?.trim()) pts += 15

  // Site surrounding area / public access context (15)
  if (site?.surroundingAreaNotes?.trim()) pts += 8
  if (site?.publicAccessNotes?.trim()) pts += 7

  return Math.min(100, pts)
}

function scoreProjectAlignment(snapshot: FilingSnapshot): number {
  const { projects, threats } = snapshot
  if (projects.length === 0) return 0

  let pts = 0

  // All projects linked to threats (30)
  const linked = projects.filter((p) => p.linkedThreatTypes.length > 0)
  pts += Math.round((linked.length / projects.length) * 30)

  // All projects have rationale ≥ 80 chars (25)
  const withRationale = projects.filter(
    (p) => p.riskReductionRationale && p.riskReductionRationale.trim().length >= 80,
  )
  pts += Math.round((withRationale.length / projects.length) * 25)

  // High-risk threats have a project (25)
  if (threats.length > 0) {
    const highRisk = threats.filter(
      (t) => t.riskLevel === 'high' || t.riskLevel === 'critical',
    )
    if (highRisk.length > 0) {
      const allLinked = new Set(projects.flatMap((p) => p.linkedThreatTypes))
      const addressed = highRisk.filter((t) => allLinked.has(t.threatType))
      pts += Math.round((addressed.length / highRisk.length) * 25)
    } else {
      pts += 15 // no high-risk threats, partial credit
    }
  }

  // Budget math is clean (20)
  const computedTotal = projects.reduce(
    (sum, p) => sum + p.budgetItems.reduce((s, b) => s + b.totalCost, 0),
    0,
  )
  if (Math.abs(computedTotal - snapshot.totalBudget) < 0.01) pts += 20

  return Math.min(100, pts)
}

function scoreBudgetQuality(snapshot: FilingSnapshot): number {
  const allItems = snapshot.projects.flatMap((p) => p.budgetItems)
  if (allItems.length === 0) return 0

  let pts = 0

  // No generic item names (30)
  const genericCount = allItems.filter((i) => isGenericItemName(i.itemName)).length
  pts += Math.round(((allItems.length - genericCount) / allItems.length) * 30)

  // ≥75% have vendor names (25)
  const withVendor = allItems.filter((i) => i.vendorName?.trim())
  const vendorPct = withVendor.length / allItems.length
  pts += vendorPct >= 0.75 ? 25 : Math.round(vendorPct * 25)

  // ≥75% have justifications (25)
  const withJust = allItems.filter((i) => i.justification?.trim())
  const justPct = withJust.length / allItems.length
  pts += justPct >= 0.75 ? 25 : Math.round(justPct * 25)

  // Budget math clean (20)
  const computedTotal = snapshot.projects.reduce(
    (sum, p) => sum + p.budgetItems.reduce((s, b) => s + b.totalCost, 0),
    0,
  )
  if (Math.abs(computedTotal - snapshot.totalBudget) < 0.01) pts += 20

  return Math.min(100, pts)
}

function scoreImplementationFeasibility(snapshot: FilingSnapshot): ReviewScores['implementation_feasibility'] {
  const { projects } = snapshot
  if (projects.length === 0) return 0

  let pts = 0

  // All projects have non-empty implementation narrative (40)
  const withImpl = projects.filter((p) => p.implementationNarrative?.trim())
  pts += Math.round((withImpl.length / projects.length) * 40)

  // ≥50% user-authored (not inferred) (30)
  const userAuthored = projects.filter((p) => p.implementationSource === 'user')
  const authoredPct = userAuthored.length / projects.length
  pts += authoredPct >= 0.5 ? 30 : Math.round(authoredPct * 60)

  // No vague language in any narrative (30)
  const withVague = projects.filter(
    (p) => p.implementationNarrative && detectVagueTerms(p.implementationNarrative).length > 0,
  )
  if (withVague.length === 0) pts += 30
  else pts += Math.round(((projects.length - withVague.length) / projects.length) * 30)

  return Math.min(100, pts)
}

function scoreSustainmentQuality(snapshot: FilingSnapshot): number {
  const { projects } = snapshot
  if (projects.length === 0) return 0

  let pts = 0

  // All projects have sustainment narrative (40)
  const withSus = projects.filter((p) => p.sustainmentNarrative?.trim())
  pts += Math.round((withSus.length / projects.length) * 40)

  // ≥50% user-authored (30)
  const userAuthored = projects.filter((p) => p.sustainmentSource === 'user')
  const authoredPct = userAuthored.length / projects.length
  pts += authoredPct >= 0.5 ? 30 : Math.round(authoredPct * 60)

  // Strong sustainment language (30) — maintenance frequency + ownership
  const withGoodSustainment = projects.filter(
    (p) =>
      p.sustainmentNarrative &&
      mentionsMaintenance(p.sustainmentNarrative) &&
      mentionsOwnership(p.sustainmentNarrative),
  )
  pts += Math.round((withGoodSustainment.length / Math.max(projects.length, 1)) * 30)

  return Math.min(100, pts)
}

function scoreAttachmentReadiness(snapshot: FilingSnapshot): number {
  const { organization: org } = snapshot
  let pts = 0

  // EIN present (25)
  if (org.einOrTaxId?.trim()) pts += 25

  // Contact name (25)
  if (org.contactName?.trim()) pts += 25

  // Contact email (25)
  if (org.contactEmail?.trim()) pts += 25

  // No budget math error (25)
  const computedTotal = snapshot.projects.reduce(
    (sum, p) => sum + p.budgetItems.reduce((s, b) => s + b.totalCost, 0),
    0,
  )
  if (Math.abs(computedTotal - snapshot.totalBudget) < 0.01) pts += 25

  return Math.min(100, pts)
}

// ── Weights ───────────────────────────────────────────────────────────────────

const WEIGHTS = {
  threat_evidence: 0.18,
  vulnerability_specificity: 0.15,
  project_alignment: 0.22,
  budget_quality: 0.20,
  implementation_feasibility: 0.12,
  sustainment_quality: 0.08,
  attachment_readiness: 0.05,
} as const

// ── Public API ────────────────────────────────────────────────────────────────

export function computeScores(snapshot: FilingSnapshot): ReviewScores {
  const threat_evidence = scoreThreatEvidence(snapshot)
  const vulnerability_specificity = scoreVulnerabilitySpecificity(snapshot)
  const project_alignment = scoreProjectAlignment(snapshot)
  const budget_quality = scoreBudgetQuality(snapshot)
  const implementation_feasibility = scoreImplementationFeasibility(snapshot)
  const sustainment_quality = scoreSustainmentQuality(snapshot)
  const attachment_readiness = scoreAttachmentReadiness(snapshot)

  const overall = Math.round(
    threat_evidence * WEIGHTS.threat_evidence +
    vulnerability_specificity * WEIGHTS.vulnerability_specificity +
    project_alignment * WEIGHTS.project_alignment +
    budget_quality * WEIGHTS.budget_quality +
    implementation_feasibility * WEIGHTS.implementation_feasibility +
    sustainment_quality * WEIGHTS.sustainment_quality +
    attachment_readiness * WEIGHTS.attachment_readiness,
  )

  return {
    overall,
    threat_evidence,
    vulnerability_specificity,
    project_alignment,
    budget_quality,
    implementation_feasibility,
    sustainment_quality,
    attachment_readiness,
  }
}

export function computeStatus(
  scores: ReviewScores,
  blockerCount: number,
): ReviewStatus {
  if (blockerCount > 0) return 'incomplete'
  if (scores.overall < 50) return 'needs_review'
  if (scores.overall < 75) return 'strong_draft'
  return 'submission_ready_candidate'
}
