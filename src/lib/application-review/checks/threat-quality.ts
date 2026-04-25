// ─── Threat Quality Checks ────────────────────────────────────────────────────
// Evaluates depth and specificity of the threat assessment.

import type { FilingSnapshot } from '@/actions/filings'
import type { ReviewFinding } from '../types'
import { slug, containsYearReference, mentionsLawEnforcement } from '../utils'

export function checkThreatQuality(snapshot: FilingSnapshot): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  const { threats, site } = snapshot

  if (threats.length === 0) return findings // already flagged by completeness

  // ── Law enforcement contact on the site ───────────────────────────────────

  if (!site?.lawEnforcementAgency?.trim()) {
    findings.push({
      id: 'threat-no-law-enforcement-contact',
      severity: 'warning',
      category: 'threat_quality',
      title: 'No law enforcement contact documented',
      explanation:
        'Applications that include a documented law enforcement threat assessment score significantly higher. FEMA expects applicants to have engaged their local police department, sheriff, or FBI field office.',
      affectedSection: 'Site Profile — Law Enforcement',
      recommendedAction:
        'Contact your local law enforcement agency for a site threat assessment, then record the agency, contact name, and date in the Site Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  // ── Per-threat checks ─────────────────────────────────────────────────────

  for (const threat of threats) {
    const tid = slug(threat.id)
    const label = threat.threatType

    // Description missing or very short
    if (!threat.description?.trim() || threat.description.trim().length < 40) {
      findings.push({
        id: `threat-no-description-${tid}`,
        severity: 'warning',
        category: 'threat_quality',
        title: 'Threat description is missing or too brief',
        explanation:
          `The "${label}" threat does not have a substantive description. FEMA reviewers need to understand the specific nature of the threat, not just its category name.`,
        affectedSection: 'Threat Assessment',
        affectedEntityId: threat.id,
        affectedEntityLabel: label,
        recommendedAction:
          'Add a detailed description: what form does this threat take, how has it manifested locally, and why is your site at elevated risk?',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    // Incident history missing
    if (!threat.incidentHistory?.trim()) {
      findings.push({
        id: `threat-no-incident-history-${tid}`,
        severity: 'warning',
        category: 'threat_quality',
        title: 'Incident history is not documented',
        explanation:
          `The "${label}" threat has no incident history. Prior incidents — even near-miss events at similar facilities — significantly strengthen the case for funding. FEMA reviewers look for evidence that the threat is real and ongoing, not hypothetical.`,
        affectedSection: 'Threat Assessment — Incident History',
        affectedEntityId: threat.id,
        affectedEntityLabel: label,
        recommendedAction:
          'Document any relevant incidents: dates, nature of event, source (news report, police report, FEMA intel brief). If no incidents occurred at this site, cite regional or national incidents involving similar facilities. Evidence needed — user must confirm.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    } else {
      // Incident history present — check for dates and law enforcement references
      if (!containsYearReference(threat.incidentHistory)) {
        findings.push({
          id: `threat-incident-no-date-${tid}`,
          severity: 'suggestion',
          category: 'threat_quality',
          title: 'Incident history lacks dated references',
          explanation:
            `The incident history for "${label}" does not appear to include a year or date. FEMA reviewers look for dated, sourced incidents to validate threat credibility.`,
          affectedSection: 'Threat Assessment — Incident History',
          affectedEntityId: threat.id,
          affectedEntityLabel: label,
          recommendedAction:
            'Add dates (at minimum the year) to each incident referenced. Example: "In [Year], a similar facility in [City] was targeted with..." Evidence needed — user must confirm.',
          canAutoFix: false,
          resolved: false,
          rejected: false,
        })
      }
    }

    // Vulnerability notes missing
    if (!threat.vulnerabilityNotes?.trim()) {
      findings.push({
        id: `threat-no-vulnerability-notes-${tid}`,
        severity: 'warning',
        category: 'threat_quality',
        title: 'Vulnerability notes are blank',
        explanation:
          `The "${label}" threat has no vulnerability notes explaining how this specific site is exposed to this threat. Generic threat assessments without site-specific vulnerability analysis score poorly.`,
        affectedSection: 'Threat Assessment — Vulnerability Notes',
        affectedEntityId: threat.id,
        affectedEntityLabel: label,
        recommendedAction:
          'Explain what makes your site specifically vulnerable: physical layout, access points, visible religious/cultural markers, public visibility, inadequate current security measures, etc.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    // Source agency missing
    if (!threat.sourceAgency?.trim()) {
      findings.push({
        id: `threat-no-source-agency-${tid}`,
        severity: 'suggestion',
        category: 'threat_quality',
        title: 'Threat source agency not credited',
        explanation:
          `The source agency for the "${label}" assessment is not documented. Citing DHS bulletins, FBI threat reports, or local law enforcement assessments adds credibility.`,
        affectedSection: 'Threat Assessment — Source',
        affectedEntityId: threat.id,
        affectedEntityLabel: label,
        recommendedAction:
          'If this threat is supported by an official source (FBI, DHS, FEMA, local police threat assessment), record the agency name. Evidence needed — user must confirm.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }
  }

  // ── Portfolio-level checks ────────────────────────────────────────────────

  // No high-risk threats
  const highRiskThreats = threats.filter(
    (t) => t.riskLevel === 'high' || t.riskLevel === 'critical',
  )
  if (highRiskThreats.length === 0 && threats.length > 0) {
    findings.push({
      id: 'threat-no-high-risk',
      severity: 'warning',
      category: 'threat_quality',
      title: 'No threats rated high or critical risk',
      explanation:
        'NSGP applications are strongest when they document at least one high or critical risk threat. If no threats are rated high/critical, FEMA reviewers may question the urgency of the grant request.',
      affectedSection: 'Threat Assessment',
      recommendedAction:
        'Review your threat likelihood and impact ratings. If accurate, ensure the narrative context explains the elevated risk environment.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  // Very few threats documented
  if (threats.length === 1) {
    findings.push({
      id: 'threat-only-one-documented',
      severity: 'suggestion',
      category: 'threat_quality',
      title: 'Only one threat has been documented',
      explanation:
        'Most competitive NSGP applications document multiple threat types (e.g., targeted violence, vandalism, social media threats, insider threats). A single threat may suggest an incomplete assessment.',
      affectedSection: 'Threat Assessment',
      recommendedAction:
        'Consider whether additional threat types apply to your site: antisemitic or anti-religious incidents, targeted violence against houses of worship, social media threats, etc.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  // At least one threat mentions law enforcement in its history
  const threatsWithLEContext = threats.filter(
    (t) =>
      mentionsLawEnforcement(t.incidentHistory ?? '') ||
      mentionsLawEnforcement(t.vulnerabilityNotes ?? '') ||
      mentionsLawEnforcement(t.description ?? '') ||
      t.sourceAgency?.trim(),
  )
  if (threatsWithLEContext.length === 0 && threats.length > 0) {
    findings.push({
      id: 'threat-no-law-enforcement-context',
      severity: 'suggestion',
      category: 'threat_quality',
      title: 'No law enforcement or official source referenced in any threat',
      explanation:
        'Citing law enforcement reports, FBI bulletins, or DHS advisories in the threat narrative significantly strengthens the application. Currently, no threat documentation references an official source.',
      affectedSection: 'Threat Assessment',
      recommendedAction:
        'Reference applicable law enforcement or government sources in the threat descriptions or incident histories. Evidence needed — user must confirm.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  return findings
}
