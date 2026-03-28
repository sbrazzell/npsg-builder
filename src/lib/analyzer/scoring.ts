import { AnalysisFlag, ProjectSnapshot, SectionReadiness } from './types'

// ---------------------------------------------------------------------------
// Text quality utilities
// ---------------------------------------------------------------------------

export function scoreTextRichness(
  text: string | null | undefined,
  minWords = 10
): number {
  if (!text || text.trim().length === 0) return 0
  const words = text.trim().split(/\s+/)
  if (words.length < minWords) return 30
  if (words.length < minWords * 2) return 60
  return 100
}

const VAGUE_PHRASES = [
  'improve security',
  'enhance safety',
  'better security',
  'various security',
  'security equipment',
  'security improvements',
  'safety measures',
  'security purposes',
]

export function detectVagueLanguage(text: string | null | undefined): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const phrase of VAGUE_PHRASES) {
    if (lower.includes(phrase)) {
      found.push(phrase)
    }
  }
  return found
}

export function scoreSpecificity(text: string | null | undefined): number {
  if (!text || text.trim().length === 0) return 0
  let score = 0
  // Numbers
  if (/\d/.test(text)) score += 20
  // Dollar amounts
  if (/\$[\d,]+/.test(text)) score += 20
  // Percentages
  if (/\d+%/.test(text)) score += 15
  // Location references (street, avenue, room, wing, etc.)
  if (/\b(street|avenue|road|blvd|room|wing|floor|corridor|entrance|exit|gate|door|lot)\b/i.test(text)) score += 20
  // Proper nouns / capitalized sequences
  if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(text)) score += 15
  // Product/hardware names
  if (/\b(camera|nvr|dvr|cctv|bollard|intercom|sensor|alarm|panel|fixture|lock|badge|card)\b/i.test(text)) score += 10
  return Math.min(score, 100)
}

export function scoreLinkage(linkedCount: number, totalPossible: number): number {
  if (totalPossible === 0) return 100
  if (linkedCount === 0) return 0
  return Math.round((linkedCount / totalPossible) * 100)
}

export function scoreCompleteness(
  fields: (string | null | undefined)[],
  requiredCount: number
): number {
  const filled = fields.filter((f) => f && f.trim().length > 0).length
  if (requiredCount === 0) return 100
  return Math.round((Math.min(filled, requiredCount) / requiredCount) * 100)
}

// ---------------------------------------------------------------------------
// Helper: count words in a string
// ---------------------------------------------------------------------------
function wordCount(text: string | null | undefined): number {
  if (!text || text.trim().length === 0) return 0
  return text.trim().split(/\s+/).length
}

// ---------------------------------------------------------------------------
// Dimension: Risk Clarity (0-20)
// ---------------------------------------------------------------------------
export function scoreRiskClarity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  threatAssessments: any[]
): { score: number; flags: AnalysisFlag[] } {
  const flags: AnalysisFlag[] = []

  if (threatAssessments.length === 0) {
    flags.push({
      severity: 'high',
      category: 'threat',
      title: 'No threat assessments recorded',
      explanation:
        'The facility has no documented threat assessments. Grant reviewers require a formal threat assessment as the foundation of the application.',
      suggestedFix:
        'Add at least 2–3 threat assessments covering the most realistic risks to your facility (e.g., unauthorized entry, vandalism, targeted violence).',
    })
    return { score: 0, flags }
  }

  let score = 0

  if (threatAssessments.length < 2) {
    score += 4
    flags.push({
      severity: 'medium',
      category: 'threat',
      title: 'Only one threat documented',
      explanation:
        'A single threat assessment does not provide a comprehensive picture of the facility\'s risk environment. Most facilities face multiple categories of threat.',
      suggestedFix:
        'Document at least 3–5 distinct threat types to demonstrate a thorough risk analysis.',
    })
  }

  // Each threat with description >= 15 words: +2 pts (max 8)
  let descPts = 0
  for (const threat of threatAssessments) {
    if (wordCount(threat.description) >= 15) {
      descPts = Math.min(descPts + 2, 8)
    } else {
      flags.push({
        severity: 'medium',
        category: 'threat',
        relatedEntityType: 'ThreatAssessment',
        relatedEntityId: threat.id,
        title: `Threat description too brief: "${threat.threatType}"`,
        explanation: `The description for "${threat.threatType}" is fewer than 15 words. A brief description doesn't demonstrate meaningful threat analysis.`,
        suggestedFix: `Expand the description to explain how and why this threat applies to your facility. Include specific vulnerability mechanisms.`,
      })
    }
  }
  score += descPts

  // Each threat with incident history filled: +2 pts (max 4)
  let histPts = 0
  for (const threat of threatAssessments) {
    if (threat.incidentHistory && threat.incidentHistory.trim().length > 0) {
      histPts = Math.min(histPts + 2, 4)
    } else {
      flags.push({
        severity: 'medium',
        category: 'threat',
        relatedEntityType: 'ThreatAssessment',
        relatedEntityId: threat.id,
        title: `No incident history recorded for threat: "${threat.threatType}"`,
        explanation: `No prior incident history has been documented for "${threat.threatType}". Reviewers expect documented history to validate need.`,
        suggestedFix: `Document any prior incidents, near-misses, or relevant incidents from similar facilities in the area. Even "no direct incident but area context" is better than blank.`,
      })
    }
  }
  score += histPts

  // All threats have likelihood AND impact not at default 3/3: +4 pts
  const nonDefaultThreats = threatAssessments.filter(
    (t) => !(t.likelihood === 3 && t.impact === 3)
  )
  if (nonDefaultThreats.length === threatAssessments.length) {
    score += 4
  } else {
    const defaultCount = threatAssessments.length - nonDefaultThreats.length
    flags.push({
      severity: 'low',
      category: 'threat',
      title: `${defaultCount} threat(s) have not been rated (using defaults)`,
      explanation: `${defaultCount} threat(s) still have the default likelihood and impact ratings of 3/3, suggesting they haven't been individually assessed.`,
      suggestedFix: "Review each threat and assign a specific likelihood (1-5) and impact (1-5) rating based on your facility's actual risk exposure.",
    })
  }

  score = Math.min(score, 20)
  if (threatAssessments.length >= 2) score = Math.max(score, 4)

  return { score, flags }
}

// ---------------------------------------------------------------------------
// Dimension: Vulnerability Specificity (0-20)
// ---------------------------------------------------------------------------
export function scoreVulnerabilitySpecificity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  facility: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _threatAssessments: any[]
): { score: number; flags: AnalysisFlag[] } {
  const flags: AnalysisFlag[] = []
  let score = 0

  if (facility.facilityName) score += 1
  if (facility.address) {
    score += 1
  } else {
    flags.push({
      severity: 'low',
      category: 'facility',
      title: 'Facility address not entered',
      explanation: 'The facility address is missing from the profile.',
      suggestedFix: 'Add the full street address to the facility profile.',
    })
  }

  const notedFields: Array<{ key: keyof typeof facility; label: string; pts: number }> = [
    { key: 'surroundingAreaNotes', label: 'Surrounding area notes', pts: 3 },
    { key: 'publicAccessNotes', label: 'Public access notes', pts: 3 },
    { key: 'parkingLotNotes', label: 'Parking lot notes', pts: 3 },
    { key: 'childrensAreasNotes', label: "Children's areas notes", pts: 3 },
    { key: 'knownSecurityConcerns', label: 'Known security concerns', pts: 3 },
    { key: 'occupancyNotes', label: 'Occupancy notes', pts: 3 },
  ]

  for (const field of notedFields) {
    const val = facility[field.key] as string | null | undefined
    if (val && wordCount(val) >= 10) {
      score += field.pts
    } else {
      flags.push({
        severity: 'low',
        category: 'vulnerability',
        title: `${field.label} is missing or too brief`,
        explanation: `"${field.label}" needs at least 10 words to provide meaningful context for grant reviewers.`,
        suggestedFix: `Describe the specific conditions, concerns, or observations relevant to ${field.label.toLowerCase()} at your facility.`,
      })
    }
  }

  return { score: Math.min(score, 20), flags }
}

// ---------------------------------------------------------------------------
// Dimension: Project Alignment (0-20)
// ---------------------------------------------------------------------------
export function scoreProjectAlignment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projects: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  threats: any[]
): { score: number; flags: AnalysisFlag[] } {
  const flags: AnalysisFlag[] = []

  if (projects.length === 0) {
    flags.push({
      severity: 'high',
      category: 'project',
      title: 'No project proposals created',
      explanation: 'There are no project proposals for this facility. Projects are the core of the grant request.',
      suggestedFix: 'Create at least one project proposal that addresses a documented threat.',
    })
    return { score: 0, flags }
  }

  let score = 0

  // Each project with >= 1 threat linked: +3 pts (max 12)
  let projLinkPts = 0
  for (const project of projects) {
    const links = project.threatLinks || []
    if (links.length > 0) {
      projLinkPts = Math.min(projLinkPts + 3, 12)
    } else {
      flags.push({
        severity: 'high',
        category: 'project',
        relatedEntityType: 'ProjectProposal',
        relatedEntityId: project.id,
        title: `Project "${project.title}" is not linked to any threat`,
        explanation: `Project "${project.title}" is not linked to any identified threat. This makes it appear unsupported and reduces grant competitiveness.`,
        suggestedFix: 'Link this project to at least one threat assessment that it is designed to mitigate.',
      })
      score -= 2
    }
  }
  score += projLinkPts

  // Each threat with >= 1 project linked: +2 pts (max 8)
  let threatCovPts = 0
  for (const threat of threats) {
    const projectsForThreat = projects.filter((p) =>
      (p.threatLinks || []).some(
        (link: { threatId: string }) => link.threatId === threat.id
      )
    )
    if (projectsForThreat.length > 0) {
      threatCovPts = Math.min(threatCovPts + 2, 8)
    } else {
      // Only flag high-risk threats
      const riskScore = (threat.likelihood || 3) * (threat.impact || 3)
      if (riskScore >= 15) {
        flags.push({
          severity: 'high',
          category: 'project',
          relatedEntityType: 'ThreatAssessment',
          relatedEntityId: threat.id,
          title: `High-risk threat "${threat.threatType}" has no project addressing it`,
          explanation: `"${threat.threatType}" is rated at risk score ${riskScore} (high/critical) but no project proposal addresses it.`,
          suggestedFix: 'Create a project proposal specifically targeting this high-risk threat, or link an existing project to it.',
        })
        score -= 2
      }
    }
  }
  score += threatCovPts

  return { score: Math.min(Math.max(score, 0), 20), flags }
}

// ---------------------------------------------------------------------------
// Dimension: Budget Defensibility (0-20)
// ---------------------------------------------------------------------------
export function scoreBudgetDefensibility(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projects: any[]
): { score: number; flags: AnalysisFlag[] } {
  const flags: AnalysisFlag[] = []

  const allBudgetItems = projects.flatMap(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => (p.budgetItems || []).map((b: any) => ({ ...b, projectTitle: p.title }))
  )

  if (allBudgetItems.length === 0) {
    flags.push({
      severity: 'high',
      category: 'budget',
      title: 'No budget items entered across any projects',
      explanation: 'There are no budget line items for any project proposal. A detailed budget is required for grant applications.',
      suggestedFix: 'Add specific budget items to each project proposal including item name, quantity, unit cost, and justification.',
    })
    return { score: 0, flags }
  }

  let score = 20

  // Each budget item missing justification: -1.5
  for (const item of allBudgetItems) {
    if (!item.justification || item.justification.trim().length === 0) {
      score -= 1.5
      flags.push({
        severity: 'medium',
        category: 'budget',
        relatedEntityType: 'BudgetItem',
        relatedEntityId: item.id,
        title: `Budget item "${item.itemName}" has no justification`,
        explanation: `The budget item "${item.itemName}" in project "${item.projectTitle}" is missing a justification. Reviewers need to understand why this item is necessary.`,
        suggestedFix: 'Add a justification explaining the vendor, model/spec, purpose, and why this cost is necessary for the security improvement.',
      })
    }
  }

  // Each budget item with generic name: -2
  const genericPatterns = /^(stuff|equipment|things|misc|miscellaneous|security equipment|security stuff|items?)$/i
  const shortNamePattern = (name: string) => name.trim().split(/\s+/).length < 4
  for (const item of allBudgetItems) {
    const isGeneric =
      genericPatterns.test(item.itemName.trim()) ||
      shortNamePattern(item.itemName) ||
      /\b(stuff|things|misc)\b/i.test(item.itemName)
    if (isGeneric) {
      score -= 2
      flags.push({
        severity: 'medium',
        category: 'budget',
        relatedEntityType: 'BudgetItem',
        relatedEntityId: item.id,
        title: `Budget item name "${item.itemName}" is too generic`,
        explanation: `"${item.itemName}" in project "${item.projectTitle}" has a vague item name. Generic names reduce credibility with grant reviewers.`,
        suggestedFix: 'Use a descriptive item name with at least 4 words, e.g., "IP Security Camera (4K, Outdoor Dome)" instead of "Camera".',
      })
    }
  }

  // Each budget item with unit_cost = 0: -2
  for (const item of allBudgetItems) {
    if (item.unitCost === 0) {
      score -= 2
      flags.push({
        severity: 'medium',
        category: 'budget',
        relatedEntityType: 'BudgetItem',
        relatedEntityId: item.id,
        title: `Budget item "${item.itemName}" has $0 unit cost`,
        explanation: `"${item.itemName}" has a unit cost of $0. This will undermine the budget credibility.`,
        suggestedFix: 'Enter the actual vendor-quoted or estimated unit cost for this item.',
      })
    }
  }

  // Each project with no budget items: -3
  for (const project of projects) {
    if (!project.budgetItems || project.budgetItems.length === 0) {
      score -= 3
      flags.push({
        severity: 'high',
        category: 'budget',
        relatedEntityType: 'ProjectProposal',
        relatedEntityId: project.id,
        title: `Project "${project.title}" has no budget items`,
        explanation: `"${project.title}" has no budget line items. Every project proposal needs a detailed budget.`,
        suggestedFix: 'Add budget line items to this project with specific items, quantities, unit costs, and justifications.',
      })
    }
  }

  return { score: Math.min(Math.max(Math.round(score), 0), 20), flags }
}

// ---------------------------------------------------------------------------
// Dimension: Narrative Quality (0-20)
// ---------------------------------------------------------------------------
export function scoreNarrativeQuality(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  narratives: any[]
): { score: number; flags: AnalysisFlag[] } {
  const flags: AnalysisFlag[] = []

  if (narratives.length === 0) {
    flags.push({
      severity: 'high',
      category: 'narrative',
      title: 'No narrative drafts generated',
      explanation: 'No narrative sections have been drafted for this facility. Narratives are critical for grant applications.',
      suggestedFix: 'Generate narrative drafts for all key sections: executive summary, threat overview, vulnerability statement, and project justification.',
    })
    return { score: 0, flags }
  }

  let totalScore = 0

  for (const narrative of narratives) {
    const text = narrative.editedText || narrative.generatedText
    let narScore = 0

    if (!text || text.trim().length === 0) {
      flags.push({
        severity: 'medium',
        category: 'narrative',
        relatedEntityType: 'NarrativeDraft',
        relatedEntityId: narrative.id,
        title: `Narrative section "${narrative.sectionName}" is empty`,
        explanation: `The "${narrative.sectionName}" section has no content.`,
        suggestedFix: 'Generate or write content for this narrative section.',
      })
      continue
    }

    const words = wordCount(text)

    if (words >= 50) narScore += 1
    if (words >= 100) narScore += 1

    // Vague language penalty
    const vagueFound = detectVagueLanguage(text)
    const vaguePenalty = vagueFound.length * 0.5
    narScore -= vaguePenalty

    if (vagueFound.length > 0) {
      flags.push({
        severity: 'low',
        category: 'narrative',
        relatedEntityType: 'NarrativeDraft',
        relatedEntityId: narrative.id,
        title: `Vague language in "${narrative.sectionName}" narrative`,
        explanation: `The narrative section contains vague phrases: "${vagueFound.join('", "')}". These weaken the application.`,
        suggestedFix: 'Replace vague phrases with specific details: named threats, actual incidents, specific proposed hardware, and measurable risk reductions.',
      })
    }

    // Short narrative flag
    if (words < 50) {
      flags.push({
        severity: 'medium',
        category: 'narrative',
        relatedEntityType: 'NarrativeDraft',
        relatedEntityId: narrative.id,
        title: `Narrative "${narrative.sectionName}" is too short`,
        explanation: `The "${narrative.sectionName}" narrative is only ${words} words. Grant reviewers expect substantive, detailed narrative sections.`,
        suggestedFix: 'Expand this narrative to at least 100 words, incorporating specific facility details, threat context, and proposed solutions.',
      })
    }

    narScore = Math.min(Math.max(narScore, 0), 3)
    totalScore += narScore
  }

  return { score: Math.min(Math.max(Math.round(totalScore), 0), 20), flags }
}

// ---------------------------------------------------------------------------
// Project-level snapshot
// ---------------------------------------------------------------------------
export function analyzeProject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allThreats: any[]
): ProjectSnapshot {
  const linkedThreatsCount = (project.threatLinks || []).length
  const budgetItemCount = (project.budgetItems || []).length
  const hasProblemStatement = !!(project.problemStatement && project.problemStatement.trim().length > 0)
  const hasRationale = !!(project.riskReductionRationale && project.riskReductionRationale.trim().length > 0)
  const hasImplementationNotes = !!(project.implementationNotes && project.implementationNotes.trim().length > 0)
  const budgetHasJustifications =
    budgetItemCount > 0 &&
    (project.budgetItems || []).every(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (b: any) => b.justification && b.justification.trim().length > 0
    )

  const findings: string[] = []
  if (linkedThreatsCount === 0) findings.push('Not linked to any threat assessment')
  if (!hasProblemStatement) findings.push('Missing problem statement')
  if (!hasRationale) findings.push('Missing risk reduction rationale')
  if (!hasImplementationNotes) findings.push('Missing implementation notes')
  if (budgetItemCount === 0) findings.push('No budget items')
  if (!budgetHasJustifications && budgetItemCount > 0) findings.push('Some budget items missing justification')

  // Calculate project score (0-100)
  let score = 0
  if (linkedThreatsCount > 0) score += 25
  if (hasProblemStatement) score += 20
  if (hasRationale) score += 20
  if (hasImplementationNotes) score += 15
  if (budgetItemCount > 0) score += 10
  if (budgetHasJustifications) score += 10

  // Bonus for multiple threat links
  if (linkedThreatsCount >= 2) score = Math.min(score + 10, 100)

  // Consider coverage: are the linked threats actually relevant?
  const linkedThreatIds = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (project.threatLinks || []).map((l: any) => l.threatId)
  )
  const coveredHighRiskThreats = allThreats.filter(
    (t) => linkedThreatIds.has(t.id) && t.likelihood * t.impact >= 10
  )
  if (coveredHighRiskThreats.length > 0) score = Math.min(score + 10, 100)

  return {
    projectId: project.id,
    projectTitle: project.title,
    score,
    linkedThreatsCount,
    budgetItemCount,
    hasProblemStatement,
    hasRationale,
    hasImplementationNotes,
    budgetHasJustifications,
    findings,
  }
}

// ---------------------------------------------------------------------------
// Section readiness
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSectionReadiness(facility: any): SectionReadiness[] {
  const sections: SectionReadiness[] = []

  // Facility profile
  {
    const issues: string[] = []
    let score = 0
    if (facility.facilityName) score += 20
    if (facility.address) { score += 20 } else issues.push('Address missing')
    if (facility.populationServed) { score += 20 } else issues.push('Population served not documented')
    if (facility.daysHoursOfOperation) { score += 20 } else issues.push('Operating hours not documented')
    if (facility.occupancyNotes) { score += 20 } else issues.push('Occupancy notes missing')
    sections.push({
      section: 'facility_profile',
      label: 'Facility Profile',
      ready: score >= 80,
      score,
      issues,
    })
  }

  // Threat assessment
  {
    const issues: string[] = []
    const threats = facility.threatAssessments || []
    let score = 0
    if (threats.length >= 2) { score += 40 } else if (threats.length === 1) { score += 20; issues.push('Only 1 threat documented — add more') } else { issues.push('No threats documented') }
    const threatsWithHistory = threats.filter((t: { incidentHistory: string | null }) => t.incidentHistory && t.incidentHistory.trim().length > 0)
    if (threatsWithHistory.length > 0) { score += 30 } else if (threats.length > 0) { issues.push('No incident history on any threat') }
    const threatsWithDesc = threats.filter((t: { description: string | null }) => t.description && t.description.split(/\s+/).length >= 15)
    if (threatsWithDesc.length > 0) { score += 30 } else if (threats.length > 0) { issues.push('Threat descriptions are too brief') }
    sections.push({
      section: 'threat_assessment',
      label: 'Threat Assessment',
      ready: score >= 70,
      score,
      issues,
    })
  }

  // Project proposals
  {
    const issues: string[] = []
    const projects = facility.projectProposals || []
    let score = 0
    if (projects.length > 0) { score += 30 } else { issues.push('No project proposals created') }
    const projWithThreats = projects.filter((p: { threatLinks: unknown[] }) => (p.threatLinks || []).length > 0)
    if (projWithThreats.length === projects.length && projects.length > 0) { score += 30 } else if (projects.length > 0) { issues.push('Some projects not linked to threats') }
    const projWithBudget = projects.filter((p: { budgetItems: unknown[] }) => (p.budgetItems || []).length > 0)
    if (projWithBudget.length === projects.length && projects.length > 0) { score += 20 } else if (projects.length > 0) { issues.push('Some projects missing budget items') }
    const projWithStatement = projects.filter((p: { problemStatement: string | null; riskReductionRationale: string | null }) => p.problemStatement && p.riskReductionRationale)
    if (projWithStatement.length === projects.length && projects.length > 0) { score += 20 } else if (projects.length > 0) { issues.push('Some projects missing problem statement or rationale') }
    sections.push({
      section: 'project_proposals',
      label: 'Project Proposals',
      ready: score >= 70,
      score,
      issues,
    })
  }

  // Narratives
  {
    const issues: string[] = []
    const narratives = facility.narrativeDrafts || []
    const narrativeSections = new Set(narratives.map((n: { sectionName: string }) => n.sectionName))
    const required = ['executive_summary', 'threat_overview', 'vulnerability_statement', 'project_justification']
    let score = 0
    for (const req of required) {
      if (narrativeSections.has(req)) {
        score += 25
      } else {
        issues.push(`Missing narrative: ${req.replace(/_/g, ' ')}`)
      }
    }
    sections.push({
      section: 'narratives',
      label: 'Narrative Drafts',
      ready: score >= 75,
      score,
      issues,
    })
  }

  // Security measures
  {
    const issues: string[] = []
    const measures = facility.securityMeasures || []
    let score = 0
    if (measures.length > 0) { score += 50 } else { issues.push('No existing security measures documented') }
    const withGaps = measures.filter((m: { gapsRemaining: string | null }) => m.gapsRemaining && m.gapsRemaining.trim().length > 0)
    if (withGaps.length > 0) { score += 50 } else if (measures.length > 0) { issues.push('No gaps documented on security measures') }
    sections.push({
      section: 'security_measures',
      label: 'Existing Security Measures',
      ready: score >= 75,
      score,
      issues,
    })
  }

  return sections
}

// ---------------------------------------------------------------------------
// Summary generators
// ---------------------------------------------------------------------------
interface DimScores {
  riskClarityScore: number
  vulnerabilitySpecificityScore: number
  projectAlignmentScore: number
  budgetDefensibilityScore: number
  narrativeQualityScore: number
  overallScore: number
  flags: AnalysisFlag[]
}

export function generateStrengths(result: DimScores): string {
  const strengths: string[] = []
  if (result.riskClarityScore >= 15) strengths.push('strong threat assessment with detailed descriptions and incident history')
  if (result.vulnerabilitySpecificityScore >= 15) strengths.push('comprehensive vulnerability documentation across all facility areas')
  if (result.projectAlignmentScore >= 15) strengths.push('well-aligned project proposals that directly address documented threats')
  if (result.budgetDefensibilityScore >= 15) strengths.push('detailed and defensible budget with specific line items and justifications')
  if (result.narrativeQualityScore >= 10) strengths.push('substantive narrative content that supports the grant narrative')
  if (result.overallScore >= 70) strengths.push('an overall application that is competitive and well-documented')

  if (strengths.length === 0) {
    return 'This application is in early stages. Focus on completing the threat assessment and project proposals first, as these are the foundation of a competitive grant application.'
  }

  return `This facility demonstrates ${strengths.join(', ')}. These elements strengthen the application and reflect well on the organization's preparedness and planning.`
}

export function generateWeaknesses(result: DimScores): string {
  const weaknesses: string[] = []
  if (result.riskClarityScore < 8) weaknesses.push('the threat assessment lacks sufficient detail and incident documentation')
  if (result.vulnerabilitySpecificityScore < 8) weaknesses.push('vulnerability documentation is incomplete or missing key facility context')
  if (result.projectAlignmentScore < 8) weaknesses.push('project proposals are not adequately linked to documented threats')
  if (result.budgetDefensibilityScore < 8) weaknesses.push('budget items lack specificity, justification, or are missing entirely')
  if (result.narrativeQualityScore < 8) weaknesses.push('narrative sections are missing, too short, or contain vague language')

  const highFlags = result.flags.filter((f) => f.severity === 'high')
  if (highFlags.length > 0) {
    weaknesses.push(`${highFlags.length} critical issue(s) require immediate attention`)
  }

  if (weaknesses.length === 0) {
    return 'No major weaknesses identified. Review the flags section for minor improvements that could further strengthen the application.'
  }

  return `The most significant gaps are: ${weaknesses.join('; ')}. Addressing these areas should be the top priority before submission.`
}

export function generatePriorityFixes(flags: AnalysisFlag[]): string {
  const highFlags = flags.filter((f) => f.severity === 'high')
  const medFlags = flags.filter((f) => f.severity === 'medium')
  const priorityFlags = [...highFlags, ...medFlags].slice(0, 5)

  if (priorityFlags.length === 0) {
    return '1. Review all narrative sections for vague language and replace with specific details.\n2. Verify all budget items have accurate vendor quotes.\n3. Ensure all threats are linked to at least one project proposal.'
  }

  return priorityFlags
    .map((flag, i) => `${i + 1}. ${flag.title}: ${flag.suggestedFix}`)
    .join('\n')
}
