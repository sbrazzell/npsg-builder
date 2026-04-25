// ─── Completeness Checks ──────────────────────────────────────────────────────
// Required fields for SF-424 and the Investment Justification.

import type { FilingSnapshot } from '@/actions/filings'
import type { ReviewFinding } from '../types'
import { slug } from '../utils'

export function checkCompleteness(snapshot: FilingSnapshot): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  const { organization: org, site, threats, projects } = snapshot

  // ── Organization ──────────────────────────────────────────────────────────

  if (!org.einOrTaxId?.trim()) {
    findings.push({
      id: 'completeness-org-no-ein',
      severity: 'blocker',
      category: 'completeness',
      title: 'EIN / Tax ID is missing',
      explanation:
        'FEMA requires an Employer Identification Number or Taxpayer ID to process the SF-424. Without it the application cannot be submitted.',
      affectedSection: 'SF-424 — Applicant Information',
      recommendedAction: 'Enter the organization\'s EIN in the Organization Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  if (!org.contactName?.trim()) {
    findings.push({
      id: 'completeness-org-no-contact-name',
      severity: 'blocker',
      category: 'completeness',
      title: 'Authorized Representative name is missing',
      explanation:
        'The SF-424 requires the name of the person who is legally authorized to sign on behalf of the organization.',
      affectedSection: 'SF-424 — Authorized Representative',
      recommendedAction: 'Add the authorized representative\'s full name in the Organization Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  if (!org.contactEmail?.trim()) {
    findings.push({
      id: 'completeness-org-no-email',
      severity: 'blocker',
      category: 'completeness',
      title: 'Contact email is missing',
      explanation:
        'FEMA and the State Administrative Agency (SAA) need a valid email address for all official correspondence.',
      affectedSection: 'SF-424 — Applicant Information',
      recommendedAction: 'Enter the contact email in the Organization Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  const hasAddress =
    org.address?.trim() ||
    org.city?.trim() ||
    org.state?.trim() ||
    org.zip?.trim()

  if (!hasAddress) {
    findings.push({
      id: 'completeness-org-no-address',
      severity: 'blocker',
      category: 'completeness',
      title: 'Mailing address is missing',
      explanation:
        'The SF-424 requires a complete mailing address (street, city, state, ZIP). This field is required by FEMA.',
      affectedSection: 'SF-424 — Applicant Information',
      recommendedAction: 'Enter the organization\'s mailing address in the Organization Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  if (!org.denomination?.trim()) {
    findings.push({
      id: 'completeness-org-no-denomination',
      severity: 'suggestion',
      category: 'completeness',
      title: 'Denomination / affiliation is blank',
      explanation:
        'FEMA uses denomination or religious affiliation to establish nonprofit mission context. Adding this helps reviewers understand the nature of the applicant.',
      affectedSection: 'Organization Profile',
      recommendedAction: 'Add the denomination or affiliation in the Organization Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  // ── Site ─────────────────────────────────────────────────────────────────

  if (!site?.siteName?.trim()) {
    findings.push({
      id: 'completeness-site-no-name',
      severity: 'blocker',
      category: 'completeness',
      title: 'Site name is missing',
      explanation: 'The site name is required on all IJ sections and the SF-424.',
      affectedSection: 'Site Profile',
      recommendedAction: 'Add a site name in the Site Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  if (!site?.address?.trim()) {
    findings.push({
      id: 'completeness-site-no-address',
      severity: 'warning',
      category: 'completeness',
      title: 'Site address is missing',
      explanation:
        'The site address is used on the Investment Justification and helps establish the geographic context for the threat environment.',
      affectedSection: 'Site Profile',
      recommendedAction: 'Add the site\'s physical address in the Site Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  if (!site?.populationServed?.trim()) {
    findings.push({
      id: 'completeness-site-no-population',
      severity: 'warning',
      category: 'completeness',
      title: 'Population served is not documented',
      explanation:
        'FEMA reviewers look for a clear description of who uses the facility and how many people the grant would protect. This is essential for demonstrating community impact.',
      affectedSection: 'Site Profile — Occupancy & Population',
      recommendedAction: 'Describe the population served (types of users, average attendance) in the Site Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  if (!site?.knownSecurityConcerns?.trim()) {
    findings.push({
      id: 'completeness-site-no-security-concerns',
      severity: 'warning',
      category: 'completeness',
      title: 'Known security concerns are not documented',
      explanation:
        'The "Known Security Concerns" field on the site profile is a key source of vulnerability context for the Investment Justification.',
      affectedSection: 'Site Profile — Security Context',
      recommendedAction: 'Document known security concerns in the Site Profile.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  // ── Threats ───────────────────────────────────────────────────────────────

  if (threats.length === 0) {
    findings.push({
      id: 'completeness-no-threats',
      severity: 'blocker',
      category: 'completeness',
      title: 'No threats have been documented',
      explanation:
        'The NSGP Investment Justification requires a documented threat assessment. Without threats, there is no basis for the grant request.',
      affectedSection: 'Threat Assessment',
      recommendedAction: 'Add at least one threat assessment in the Threats section.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  if (projects.length === 0) {
    findings.push({
      id: 'completeness-no-projects',
      severity: 'blocker',
      category: 'completeness',
      title: 'No project proposals have been created',
      explanation:
        'The NSGP requires at least one security improvement project. Projects define what the grant funds will purchase and implement.',
      affectedSection: 'Projects',
      recommendedAction: 'Add at least one project proposal in the Projects section.',
      canAutoFix: false,
      resolved: false,
      rejected: false,
    })
  }

  for (const project of projects) {
    const pid = slug(project.id)

    if (!project.problemStatement?.trim()) {
      findings.push({
        id: `completeness-project-no-problem-${pid}`,
        severity: 'blocker',
        category: 'completeness',
        title: 'Problem Statement is blank',
        explanation:
          'Every project requires a Problem Statement that explains what security gap exists and why it exposes the organization to harm.',
        affectedSection: 'Investment Justification — Project Problem Statement',
        affectedEntityId: project.id,
        affectedEntityLabel: project.title,
        recommendedAction: 'Write a problem statement in the project editor.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    if (!project.proposedSolution?.trim()) {
      findings.push({
        id: `completeness-project-no-solution-${pid}`,
        severity: 'blocker',
        category: 'completeness',
        title: 'Proposed Solution is blank',
        explanation:
          'Each project needs a Proposed Solution describing what will be installed or implemented to close the identified security gap.',
        affectedSection: 'Investment Justification — Proposed Solution',
        affectedEntityId: project.id,
        affectedEntityLabel: project.title,
        recommendedAction: 'Write the proposed solution in the project editor.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    if (!project.riskReductionRationale?.trim()) {
      findings.push({
        id: `completeness-project-no-rationale-${pid}`,
        severity: 'warning',
        category: 'completeness',
        title: 'Risk Reduction Rationale is blank',
        explanation:
          'The Risk Reduction Rationale explains how the proposed project will reduce the likelihood or impact of identified threats. It is a scored component of the NSGP review.',
        affectedSection: 'Investment Justification — Risk Reduction Rationale',
        affectedEntityId: project.id,
        affectedEntityLabel: project.title,
        recommendedAction: 'Add a risk reduction rationale that connects the project to specific threat types.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    if (!project.implementationNarrative?.trim()) {
      findings.push({
        id: `completeness-project-no-implementation-${pid}`,
        severity: 'warning',
        category: 'completeness',
        title: 'Implementation Plan is blank',
        explanation:
          'FEMA reviewers expect a clear implementation plan: who will do the work, what steps are involved, and how completion will be verified.',
        affectedSection: 'Investment Justification — Implementation Plan',
        affectedEntityId: project.id,
        affectedEntityLabel: project.title,
        recommendedAction: 'Add implementation details in the project editor.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    if (!project.timelineNarrative?.trim()) {
      findings.push({
        id: `completeness-project-no-timeline-${pid}`,
        severity: 'warning',
        category: 'completeness',
        title: 'Timeline narrative is blank',
        explanation:
          'The NSGP expects a timeline showing when key milestones will occur within the period of performance.',
        affectedSection: 'Investment Justification — Timeline',
        affectedEntityId: project.id,
        affectedEntityLabel: project.title,
        recommendedAction: 'Add timeline details in the project editor.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    if (!project.sustainmentNarrative?.trim()) {
      findings.push({
        id: `completeness-project-no-sustainment-${pid}`,
        severity: 'warning',
        category: 'completeness',
        title: 'Sustainment Plan is blank',
        explanation:
          'FEMA requires applicants to show how they will maintain the funded security improvement beyond the period of performance.',
        affectedSection: 'Investment Justification — Sustainment Plan',
        affectedEntityId: project.id,
        affectedEntityLabel: project.title,
        recommendedAction: 'Add sustainment details in the project editor.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    if (project.budgetItems.length === 0) {
      findings.push({
        id: `completeness-project-no-budget-${pid}`,
        severity: 'blocker',
        category: 'completeness',
        title: 'No budget items',
        explanation:
          'Every project must have at least one budget line item. Without budget items, the project has no funding basis.',
        affectedSection: 'Budget Worksheet',
        affectedEntityId: project.id,
        affectedEntityLabel: project.title,
        recommendedAction: 'Add budget items in the project editor.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }

    if (
      project.linkedThreatTypes.length === 0 &&
      // Only flag if threats exist (no threats is already a blocker)
      snapshot.threats.length > 0
    ) {
      findings.push({
        id: `completeness-project-no-threats-${pid}`,
        severity: 'warning',
        category: 'completeness',
        title: 'Project is not linked to any threats',
        explanation:
          'FEMA evaluates whether each project directly addresses documented threats. An unlinked project will score lower and may be questioned by reviewers.',
        affectedSection: 'Investment Justification — Project–Threat Alignment',
        affectedEntityId: project.id,
        affectedEntityLabel: project.title,
        recommendedAction: 'Link this project to at least one threat in the project editor.',
        canAutoFix: false,
        resolved: false,
        rejected: false,
      })
    }
  }

  return findings
}
