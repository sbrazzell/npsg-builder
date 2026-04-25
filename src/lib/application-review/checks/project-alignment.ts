// ─── Project Alignment Checks ─────────────────────────────────────────────────
// Verifies that projects map to threats, budgets support projects, and
// that rationale is specific enough to survive grant review.

import type { FilingSnapshot } from '@/actions/filings'
import type { ReviewFinding } from '../types'
import { slug, isTooShort } from '../utils'

export function checkProjectAlignment(snapshot: FilingSnapshot): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  const { threats, projects } = snapshot

  if (projects.length === 0 || threats.length === 0) return findings

  // ── Each project should link to at least one threat ───────────────────────

  for (const project of projects) {
    const pid = slug(project.id)

    if (project.linkedThreatTypes.length === 0) {
      // Already covered by completeness; skip duplicate
      continue
    }

    // Risk reduction rationale too vague
    const rationale = project.riskReductionRationale ?? ''
    if (rationale.trim() && isTooShort(rationale, 80)) {
      findings.push({
        id: `alignment-rationale-too-short-${pid}`,
        severity: 'suggestion',
        category: 'project_alignment',
        title: 'Risk Reduction Rationale is too brief',
        explanation:
          `The risk reduction rationale for "${project.title}" is very short. Reviewers look for a clear explanation of how the project reduces the likelihood or impact of specific documented threats.`,
        affectedSection: 'Investment Justification — Risk Reduction Rationale',
        affectedEntityId: project.id,
        affectedEntityLabel: project.title,
        recommendedAction:
          'Expand the rationale to explicitly name the threat types addressed, explain the mechanism of risk reduction, and state the expected improvement (e.g., from high risk to medium risk).',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    // Rationale doesn't mention any of the linked threat types
    if (rationale.trim() && project.linkedThreatTypes.length > 0) {
      const linkedMentioned = project.linkedThreatTypes.some((threatType) => {
        const keyword = threatType.toLowerCase().split(/[\s/,]+/)[0] ?? ''
        return keyword.length > 3 && rationale.toLowerCase().includes(keyword)
      })
      if (!linkedMentioned) {
        findings.push({
          id: `alignment-rationale-no-threat-mention-${pid}`,
          severity: 'suggestion',
          category: 'project_alignment',
          title: 'Risk Reduction Rationale does not name the linked threats',
          explanation:
            `The rationale for "${project.title}" does not appear to reference the specific threat types it addresses. FEMA reviewers expect to see an explicit connection between the project and the documented threats.`,
          affectedSection: 'Investment Justification — Risk Reduction Rationale',
          affectedEntityId: project.id,
          affectedEntityLabel: project.title,
          recommendedAction:
            `Reference the specific threat types in the rationale: ${project.linkedThreatTypes.slice(0, 3).join(', ')}.`,
          canAutoFix: false,
          resolved: false,
          rejected: false,
        })
      }
    }
  }

  // ── High-risk threats should have at least one project ────────────────────

  const allLinkedThreatTypes = new Set(projects.flatMap((p) => p.linkedThreatTypes))

  const highRiskUnaddressed = threats.filter(
    (t) =>
      (t.riskLevel === 'high' || t.riskLevel === 'critical') &&
      !allLinkedThreatTypes.has(t.threatType),
  )

  for (const threat of highRiskUnaddressed) {
    const tid = slug(threat.id)
    findings.push({
      id: `alignment-high-risk-unaddressed-${tid}`,
      severity: 'warning',
      category: 'project_alignment',
      title: `High-risk threat "${threat.threatType}" has no project addressing it`,
      explanation:
        `This threat is rated ${threat.riskLevel} risk (score: ${threat.riskScore}) but no project is linked to it. FEMA reviewers expect the grant projects to directly address the highest-risk threats documented.`,
      affectedSection: 'Investment Justification — Project–Threat Alignment',
      affectedEntityId: threat.id,
      affectedEntityLabel: threat.threatType,
      recommendedAction:
        'Link an existing project to this threat, or create a new project that specifically addresses this threat type.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  // ── Budget item math integrity ────────────────────────────────────────────

  for (const project of projects) {
    const pid = slug(project.id)
    for (const item of project.budgetItems) {
      const iid = slug(item.id)
      const expected = item.quantity * item.unitCost
      const actual = item.totalCost
      if (Math.abs(expected - actual) > 0.01) {
        findings.push({
          id: `alignment-budget-item-math-${pid}-${iid}`,
          severity: 'warning',
          category: 'project_alignment',
          title: 'Budget item total cost does not match quantity × unit cost',
          explanation:
            `"${item.itemName}" in "${project.title}": ${item.quantity} × $${item.unitCost.toFixed(2)} = $${expected.toFixed(2)}, but total cost is recorded as $${actual.toFixed(2)}. This discrepancy will be caught by FEMA reviewers.`,
          affectedSection: 'Budget Worksheet',
          affectedEntityId: item.id,
          affectedEntityLabel: item.itemName,
          recommendedAction: 'Correct the quantity, unit cost, or total cost so the math is consistent.',
          canAutoFix: false,
          resolved: false,
          rejected: false,
        })
      }
    }
  }

  // ── Budget grand total matches snapshot ───────────────────────────────────

  const computedTotal = projects.reduce(
    (sum, p) => sum + p.budgetItems.reduce((s, b) => s + b.totalCost, 0),
    0,
  )
  if (Math.abs(computedTotal - snapshot.totalBudget) > 0.01) {
    findings.push({
      id: 'alignment-budget-total-mismatch',
      severity: 'blocker',
      category: 'project_alignment',
      title: 'Budget grand total does not match line items',
      explanation:
        `The snapshot total is $${snapshot.totalBudget.toFixed(2)} but budget line items sum to $${computedTotal.toFixed(2)}. This inconsistency will cause the application to fail review. Regenerate the draft to sync totals.`,
      affectedSection: 'Budget Worksheet — Grand Total',
      recommendedAction: 'Regenerate the application draft so budget totals are recalculated.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  return findings
}
