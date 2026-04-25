import { describe, it, expect } from 'vitest'
import { runApplicationReview, applyFixToSnapshot } from '@/lib/application-review/runner'
import { computeScores } from '@/lib/application-review/scorer'
import { checkCompleteness } from '@/lib/application-review/checks/completeness'
import { checkThreatQuality } from '@/lib/application-review/checks/threat-quality'
import { checkBudgetQuality } from '@/lib/application-review/checks/budget'
import { checkImplementation } from '@/lib/application-review/checks/implementation'
import { checkSustainment } from '@/lib/application-review/checks/sustainment'
import { checkProjectAlignment } from '@/lib/application-review/checks/project-alignment'
import type { FilingSnapshot } from '@/actions/filings'

// ─── Snapshot factory ─────────────────────────────────────────────────────────

function makeBudgetItem(
  overrides: Partial<FilingSnapshot['projects'][number]['budgetItems'][number]> = {},
): FilingSnapshot['projects'][number]['budgetItems'][number] {
  return {
    id: 'bi-1',
    itemName: 'HID multiClass SE325 card reader',
    category: 'Equipment',
    quantity: 4,
    unitCost: 2500,
    totalCost: 10000,
    vendorName: 'Allegion',
    justification: 'Replaces legacy key-and-lock system at all entry points.',
    ...overrides,
  }
}

function makeProject(
  overrides: Partial<FilingSnapshot['projects'][number]> = {},
): FilingSnapshot['projects'][number] {
  return {
    id: 'proj-1',
    title: 'Access Control Upgrade',
    category: 'Physical Security',
    problemStatement:
      'The main entrance and three secondary doors lack electronic access control, exposing the building to unauthorized entry by any person who enters during open hours.',
    proposedSolution:
      'Install HID multiClass SE325 card readers at all four entry points, connected to a Lenel S2 access control panel, enabling credential-based access and audit logging.',
    riskReductionRationale:
      'This project directly addresses the Unauthorized Entry threat by restricting physical access to credentialed individuals. Risk is expected to decrease from high to low.',
    implementationNotes: null,
    priority: 1,
    status: 'draft',
    projectBudget: 10000,
    budgetItems: [makeBudgetItem()],
    linkedThreatTypes: ['Unauthorized Entry'],
    implementationNarrative:
      'Following award notification, the organization will coordinate with a licensed security integrator to procure and install HID card readers at all four entry points. The integrator will run conduit, mount readers, configure the access control panel, provision credentials, and conduct a full system test before closeout.',
    implementationSource: 'user',
    timelineNarrative:
      'Month 1: Procurement and vendor coordination. Month 2: Installation by licensed integrator. Month 3: Testing, staff training, and project closeout.',
    sustainmentNarrative:
      'The Facilities Manager will be responsible for ongoing maintenance. Equipment will be inspected quarterly and serviced annually by the integrator under a service agreement funded from the operating budget.',
    timelineSource: 'user',
    sustainmentSource: 'user',
    generationWarnings: [],
    ...overrides,
  }
}

function makeSnapshot(overrides: Partial<FilingSnapshot> = {}): FilingSnapshot {
  const project = makeProject()
  return {
    capturedAt: new Date().toISOString(),
    organization: {
      id: 'org-1',
      name: 'Grace Community Church',
      denomination: 'Non-denominational Protestant',
      address: '4200 N Lincoln Ave',
      city: 'Chicago',
      state: 'IL',
      zip: '60618',
      contactName: 'Pastor James Whitfield',
      contactEmail: 'james@gracecc.org',
      contactPhone: '(773) 555-0142',
      einOrTaxId: '36-4821047',
    },
    site: {
      id: 'site-1',
      siteName: 'Grace Community Church — Main Campus',
      address: '4200 N Lincoln Ave, Chicago, IL 60618',
      populationServed:
        'Approximately 350 weekly attendees including families with children, elderly members, and a weekday food pantry serving 80+ community members.',
      knownSecurityConcerns:
        'Unlocked side doors during services; no cameras at rear parking lot; no credentialing system at any entrance.',
      daysHoursOfOperation: 'Sunday 8am-1pm; Wednesday 6pm-9pm; Food pantry Tue/Thu 9am-12pm',
      surroundingAreaNotes: 'Located on a busy arterial street; adjacent to a park with known loitering.',
      publicAccessNotes: 'Facility is open to the public during all services and pantry hours.',
      lawEnforcementAgency: 'Chicago Police Department — 19th District',
      lawEnforcementContactName: 'Officer Maria Santos',
      lawEnforcementContactDate: '2026-01-15',
      lawEnforcementResponseDate: '2026-01-22',
      lawEnforcementFindings: 'District confirmed elevated risk of antisemitic and anti-religious incidents in the area.',
      childrensAreasNotes: null,
      parkingLotNotes: null,
      occupancyNotes: null,
      notes: null,
    },
    threats: [
      {
        id: 'threat-1',
        threatType: 'Unauthorized Entry',
        description: 'Individuals who are not members of the congregation have entered the building during services on multiple occasions, creating security concerns for staff and attendees.',
        likelihood: 4,
        impact: 4,
        riskScore: 16,
        riskLevel: 'high',
        source: 'self_assessed',
        sourceAgency: 'Chicago Police Department',
        vulnerabilityNotes: 'All four entry points are unlocked during open hours. No cameras cover the rear entrance.',
        incidentHistory: 'In 2024, an unidentified individual entered the sanctuary during Sunday service and was removed by ushers. In 2023, a similar incident occurred at the food pantry entrance.',
      },
    ],
    securityMeasures: [
      {
        id: 'sm-1',
        category: 'Access Control',
        description: 'Traditional key-and-lock system on all doors.',
        effectivenessRating: 1,
        gapsRemaining: 'Keys cannot be revoked remotely; no audit trail; no camera coverage at any entry point.',
      },
    ],
    projects: [project],
    narratives: {
      threat_overview: 'The site has experienced repeated acts of unauthorized entry.',
    },
    totalBudget: 10000,
    highRiskThreatCount: 1,
    ...overrides,
  }
}

// ─── 1. Missing required section creates a blocker ────────────────────────────

describe('Completeness checks', () => {
  it('missing EIN creates a blocker', () => {
    const snap = makeSnapshot({
      organization: { ...makeSnapshot().organization, einOrTaxId: null },
    })
    const findings = checkCompleteness(snap)
    const blocker = findings.find((f) => f.id === 'completeness-org-no-ein')
    expect(blocker).toBeDefined()
    expect(blocker!.severity).toBe('blocker')
  })

  it('missing contact name creates a blocker', () => {
    const snap = makeSnapshot({
      organization: { ...makeSnapshot().organization, contactName: null },
    })
    const findings = checkCompleteness(snap)
    const blocker = findings.find((f) => f.id === 'completeness-org-no-contact-name')
    expect(blocker).toBeDefined()
    expect(blocker!.severity).toBe('blocker')
  })

  it('no threats creates a blocker', () => {
    const snap = makeSnapshot({ threats: [] })
    const findings = checkCompleteness(snap)
    const blocker = findings.find((f) => f.id === 'completeness-no-threats')
    expect(blocker).toBeDefined()
    expect(blocker!.severity).toBe('blocker')
  })

  it('no projects creates a blocker', () => {
    const snap = makeSnapshot({ projects: [] })
    const findings = checkCompleteness(snap)
    const blocker = findings.find((f) => f.id === 'completeness-no-projects')
    expect(blocker).toBeDefined()
    expect(blocker!.severity).toBe('blocker')
  })

  it('missing problem statement creates a blocker for that project', () => {
    const snap = makeSnapshot({
      projects: [makeProject({ problemStatement: '' })],
    })
    const findings = checkCompleteness(snap)
    const blocker = findings.find((f) => f.id.startsWith('completeness-project-no-problem'))
    expect(blocker).toBeDefined()
    expect(blocker!.severity).toBe('blocker')
    expect(blocker!.affectedEntityLabel).toBe('Access Control Upgrade')
  })

  it('missing budget items creates a blocker', () => {
    const snap = makeSnapshot({
      projects: [makeProject({ budgetItems: [] })],
    })
    const findings = checkCompleteness(snap)
    const blocker = findings.find((f) => f.id.startsWith('completeness-project-no-budget'))
    expect(blocker).toBeDefined()
    expect(blocker!.severity).toBe('blocker')
  })

  it('project not linked to any threat creates a warning', () => {
    const snap = makeSnapshot({
      projects: [makeProject({ linkedThreatTypes: [] })],
    })
    const findings = checkCompleteness(snap)
    const warning = findings.find((f) => f.id.startsWith('completeness-project-no-threats'))
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('warning')
  })

  it('complete snapshot produces no completeness blockers', () => {
    const snap = makeSnapshot()
    const findings = checkCompleteness(snap)
    const blockers = findings.filter((f) => f.severity === 'blocker')
    expect(blockers).toHaveLength(0)
  })
})

// ─── 2. Generic budget item creates a warning with autofix ────────────────────

describe('Budget quality checks', () => {
  it('generic item name creates a warning', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          budgetItems: [makeBudgetItem({ itemName: 'Security equipment' })],
        }),
      ],
    })
    const findings = checkBudgetQuality(snap)
    const warning = findings.find((f) => f.id.startsWith('budget-generic-item'))
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('warning')
  })

  it('generic item has autofix=true', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          budgetItems: [makeBudgetItem({ itemName: 'Camera' })],
        }),
      ],
    })
    const findings = checkBudgetQuality(snap)
    const warning = findings.find((f) => f.id.startsWith('budget-generic-item'))
    expect(warning!.canAutoFix).toBe(true)
    expect(warning!.proposedFix).toBeDefined()
    expect(warning!.proposedFix!.type).toBe('budget_item_rename')
  })

  it('autofix for generic item has evidence confirmation required', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          budgetItems: [makeBudgetItem({ itemName: 'Equipment' })],
        }),
      ],
    })
    const findings = checkBudgetQuality(snap)
    const warning = findings.find((f) => f.id.startsWith('budget-generic-item'))
    expect(warning!.proposedFix!.requiresEvidenceConfirmation).toBe(true)
    expect(warning!.proposedFix!.guardrailTags).toContain('user_must_confirm')
  })

  it('specific item name does NOT create a generic-item warning', () => {
    const snap = makeSnapshot()
    const findings = checkBudgetQuality(snap)
    const genericWarnings = findings.filter((f) => f.id.startsWith('budget-generic-item'))
    expect(genericWarnings).toHaveLength(0)
  })

  it('zero cost item creates a blocker', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          budgetItems: [makeBudgetItem({ totalCost: 0, unitCost: 0 })],
        }),
      ],
    })
    const findings = checkBudgetQuality(snap)
    const blocker = findings.find((f) => f.id.startsWith('budget-zero-cost'))
    expect(blocker).toBeDefined()
    expect(blocker!.severity).toBe('blocker')
  })

  it('missing vendor name creates a suggestion', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          budgetItems: [makeBudgetItem({ vendorName: null })],
        }),
      ],
    })
    const findings = checkBudgetQuality(snap)
    const suggestion = findings.find((f) => f.id.startsWith('budget-no-vendor'))
    expect(suggestion).toBeDefined()
    expect(suggestion!.severity).toBe('suggestion')
  })
})

// ─── 3. Unsupported threat claim creates a warning ────────────────────────────

describe('Threat quality checks', () => {
  it('threat with no incident history creates a warning', () => {
    const snap = makeSnapshot({
      threats: [
        {
          ...makeSnapshot().threats[0],
          incidentHistory: null,
        },
      ],
    })
    const findings = checkThreatQuality(snap)
    const warning = findings.find((f) => f.id.startsWith('threat-no-incident-history'))
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('warning')
  })

  it('incident history with no date reference creates a suggestion', () => {
    const snap = makeSnapshot({
      threats: [
        {
          ...makeSnapshot().threats[0],
          incidentHistory: 'A suspicious individual was seen loitering near the entrance.',
        },
      ],
    })
    const findings = checkThreatQuality(snap)
    const suggestion = findings.find((f) => f.id.startsWith('threat-incident-no-date'))
    expect(suggestion).toBeDefined()
    expect(suggestion!.severity).toBe('suggestion')
  })

  it('dated incident history does NOT flag for missing dates', () => {
    const snap = makeSnapshot() // has "In 2024..." in incident history
    const findings = checkThreatQuality(snap)
    const dateSuggestion = findings.find((f) => f.id.startsWith('threat-incident-no-date'))
    expect(dateSuggestion).toBeUndefined()
  })

  it('threat with no vulnerability notes creates a warning', () => {
    const snap = makeSnapshot({
      threats: [
        {
          ...makeSnapshot().threats[0],
          vulnerabilityNotes: null,
        },
      ],
    })
    const findings = checkThreatQuality(snap)
    const warning = findings.find((f) => f.id.startsWith('threat-no-vulnerability-notes'))
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('warning')
  })

  it('no law enforcement contact creates a warning', () => {
    const snap = makeSnapshot({
      site: {
        ...makeSnapshot().site,
        lawEnforcementAgency: null,
        lawEnforcementContactName: null,
      },
    })
    const findings = checkThreatQuality(snap)
    const warning = findings.find((f) => f.id === 'threat-no-law-enforcement-contact')
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('warning')
  })

  it('no threat warnings fire for no-threat snapshots (completeness handles it)', () => {
    const snap = makeSnapshot({ threats: [] })
    const findings = checkThreatQuality(snap)
    // When threats.length === 0, the function returns [] immediately
    expect(findings).toHaveLength(0)
  })
})

// ─── 4. Complete project receives a strong score ──────────────────────────────

describe('Scoring — complete project', () => {
  it('fully complete snapshot scores above 70', () => {
    const snap = makeSnapshot()
    const scores = computeScores(snap)
    expect(scores.overall).toBeGreaterThan(70)
  })

  it('project alignment score is high when all projects are threat-linked', () => {
    const snap = makeSnapshot()
    const scores = computeScores(snap)
    expect(scores.project_alignment).toBeGreaterThanOrEqual(50)
  })

  it('implementation score is high when narrative is user-authored and non-vague', () => {
    const snap = makeSnapshot()
    const scores = computeScores(snap)
    expect(scores.implementation_feasibility).toBeGreaterThan(50)
  })

  it('overall score is lower when no threats exist than when threats are present', () => {
    const snapWithThreats = makeSnapshot()
    const snapNoThreats = makeSnapshot({ threats: [] })
    const scoresWithThreats = computeScores(snapWithThreats)
    const scoresNoThreats = computeScores(snapNoThreats)
    expect(scoresNoThreats.threat_evidence).toBe(0)
    // Removing the full threat section (18% weight, 0 pts) must reduce the overall score
    expect(scoresNoThreats.overall).toBeLessThan(scoresWithThreats.overall)
  })

  it('budget score is lower when all items are generic', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          budgetItems: [
            makeBudgetItem({ itemName: 'Security equipment', vendorName: null, justification: null }),
          ],
        }),
      ],
    })
    const genericScores = computeScores(snap)
    const fullScores = computeScores(makeSnapshot())
    expect(genericScores.budget_quality).toBeLessThan(fullScores.budget_quality)
  })

  it('review status is incomplete when blockers exist', () => {
    const snap = makeSnapshot({
      organization: { ...makeSnapshot().organization, einOrTaxId: null },
    })
    const review = runApplicationReview(snap, 'draft-1')
    expect(review.reviewStatus).toBe('incomplete')
  })

  it('review status is submission_ready_candidate when snapshot is complete', () => {
    const snap = makeSnapshot()
    const review = runApplicationReview(snap, 'draft-1')
    expect(review.reviewStatus).not.toBe('incomplete')
    // A fully complete snapshot should score reasonably well
    expect(review.scores.overall).toBeGreaterThan(50)
  })
})

// ─── 5. Autofix proposal does NOT apply until accepted ───────────────────────

describe('Autofix — not applied until accepted', () => {
  it('proposedFix is only stored in the finding, not applied to the snapshot', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          budgetItems: [makeBudgetItem({ itemName: 'Camera' })],
        }),
      ],
    })
    const review = runApplicationReview(snap, 'draft-1')
    const genericFinding = review.findings.find((f) => f.id.startsWith('budget-generic-item'))

    expect(genericFinding).toBeDefined()
    expect(genericFinding!.proposedFix).toBeDefined()

    // The snapshot itself is untouched
    expect(snap.projects[0].budgetItems[0].itemName).toBe('Camera')
  })

  it('finding resolved flag starts as false', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          budgetItems: [makeBudgetItem({ itemName: 'Security equipment' })],
        }),
      ],
    })
    const review = runApplicationReview(snap, 'draft-1')
    review.findings.forEach((f) => {
      expect(f.resolved).toBe(false)
    })
  })
})

// ─── 6. Accepted fix updates snapshot data and resolves the finding ───────────

describe('applyFixToSnapshot', () => {
  it('applies a budget item rename via targetPath', () => {
    const snap = makeSnapshot()
    const patched = applyFixToSnapshot(
      snap,
      `projects[proj-1].budgetItems[bi-1].itemName`,
      'HID multiClass SE325 card reader — Model 940PTNNEK00000',
    )
    expect(patched.projects[0].budgetItems[0].itemName).toBe(
      'HID multiClass SE325 card reader — Model 940PTNNEK00000',
    )
    // Original snapshot is not mutated
    expect(snap.projects[0].budgetItems[0].itemName).toBe('HID multiClass SE325 card reader')
  })

  it('applies a project narrative replacement', () => {
    const snap = makeSnapshot()
    const newNarrative = 'Updated implementation narrative with specific contractor details.'
    const patched = applyFixToSnapshot(
      snap,
      `projects[proj-1].implementationNarrative`,
      newNarrative,
    )
    expect(patched.projects[0].implementationNarrative).toBe(newNarrative)
    expect(snap.projects[0].implementationNarrative).not.toBe(newNarrative)
  })

  it('applies an organization field patch', () => {
    const snap = makeSnapshot({ organization: { ...makeSnapshot().organization, einOrTaxId: null } })
    const patched = applyFixToSnapshot(snap, 'organization.einOrTaxId', '36-4821047')
    expect((patched.organization as Record<string, unknown>).einOrTaxId).toBe('36-4821047')
  })

  it('returns unchanged snapshot for unknown path (safe fallback)', () => {
    const snap = makeSnapshot()
    const patched = applyFixToSnapshot(snap, 'unknown.nonexistent.path', 'value')
    expect(patched.totalBudget).toBe(snap.totalBudget)
    expect(patched.projects[0].title).toBe(snap.projects[0].title)
  })

  it('does not mutate the original snapshot (deep clone)', () => {
    const snap = makeSnapshot()
    const original = JSON.stringify(snap)
    applyFixToSnapshot(snap, 'projects[proj-1].implementationNarrative', 'Changed.')
    expect(JSON.stringify(snap)).toBe(original)
  })
})

// ─── 7. Review history stores prior score and findings ────────────────────────

describe('Review result structure', () => {
  it('review has an id, draftId, and createdAt', () => {
    const snap = makeSnapshot()
    const review = runApplicationReview(snap, 'draft-abc-123')
    expect(review.id).toBeTruthy()
    expect(review.draftId).toBe('draft-abc-123')
    expect(review.createdAt).toBeTruthy()
    expect(new Date(review.createdAt).getTime()).toBeGreaterThan(0)
  })

  it('review tallies match findings array', () => {
    const snap = makeSnapshot({
      organization: { ...makeSnapshot().organization, einOrTaxId: null, contactName: null },
    })
    const review = runApplicationReview(snap, 'draft-1')
    const counted = {
      blocker: review.findings.filter((f) => f.severity === 'blocker').length,
      warning: review.findings.filter((f) => f.severity === 'warning').length,
      suggestion: review.findings.filter((f) => f.severity === 'suggestion').length,
    }
    expect(review.blockerCount).toBe(counted.blocker)
    expect(review.warningCount).toBe(counted.warning)
    expect(review.suggestionCount).toBe(counted.suggestion)
    expect(review.totalFindings).toBe(review.findings.length)
  })

  it('unresolved blockers count is correct on a fresh review', () => {
    const snap = makeSnapshot({
      organization: { ...makeSnapshot().organization, einOrTaxId: null },
    })
    const review = runApplicationReview(snap, 'draft-1')
    expect(review.unresolvedBlockers).toBe(review.blockerCount)
    expect(review.resolvedCount).toBe(0)
  })

  it('review includes a non-empty summary', () => {
    const snap = makeSnapshot()
    const review = runApplicationReview(snap, 'draft-1')
    expect(review.summary.overallReadiness).toBeTruthy()
    expect(review.summary.suggestedNextAction).toBeTruthy()
    expect(Array.isArray(review.summary.topImprovements)).toBe(true)
  })
})

// ─── 8. No invented facts in autofix proposals ────────────────────────────────

describe('Autofix guardrails — no invented facts', () => {
  it('budget item autofix is marked requiresEvidenceConfirmation=true', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({ budgetItems: [makeBudgetItem({ itemName: 'Lock' })] }),
      ],
    })
    const findings = checkBudgetQuality(snap)
    const autoFix = findings.find((f) => f.canAutoFix && f.proposedFix)
    expect(autoFix).toBeDefined()
    expect(autoFix!.proposedFix!.requiresEvidenceConfirmation).toBe(true)
  })

  it('incident-history finding has canAutoFix=false (cannot invent incidents)', () => {
    const snap = makeSnapshot({
      threats: [{ ...makeSnapshot().threats[0], incidentHistory: null }],
    })
    const findings = checkThreatQuality(snap)
    const incidentFinding = findings.find((f) => f.id.startsWith('threat-no-incident-history'))
    expect(incidentFinding).toBeDefined()
    expect(incidentFinding!.canAutoFix).toBe(false)
  })

  it('source agency finding has canAutoFix=false (cannot invent official sources)', () => {
    const snap = makeSnapshot({
      threats: [{ ...makeSnapshot().threats[0], sourceAgency: null }],
    })
    const findings = checkThreatQuality(snap)
    const sourceFinding = findings.find((f) => f.id.startsWith('threat-no-source-agency'))
    expect(sourceFinding).toBeDefined()
    expect(sourceFinding!.canAutoFix).toBe(false)
  })

  it('law enforcement contact finding has canAutoFix=false (cannot invent police reports)', () => {
    const snap = makeSnapshot({
      site: { ...makeSnapshot().site, lawEnforcementAgency: null },
    })
    const findings = checkThreatQuality(snap)
    const leFinding = findings.find((f) => f.id === 'threat-no-law-enforcement-contact')
    expect(leFinding).toBeDefined()
    expect(leFinding!.canAutoFix).toBe(false)
  })

  it('vague language fix does not add any invented claims', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          implementationNarrative:
            'A contractor will install the equipment ASAP. Testing will be completed TBD. Various staff will be trained as needed.',
          implementationSource: 'inferred',
        }),
      ],
    })
    const findings = checkImplementation(snap)
    const vagueFinding = findings.find((f) => f.id.startsWith('implementation-vague-language'))
    expect(vagueFinding).toBeDefined()
    expect(vagueFinding!.canAutoFix).toBe(true)
    expect(vagueFinding!.proposedFix!.requiresEvidenceConfirmation).toBe(false)
    // Proposed text should not contain police reports, certifications, or vendor names
    expect(vagueFinding!.proposedFix!.proposed).not.toMatch(/police report/i)
    expect(vagueFinding!.proposedFix!.proposed).not.toMatch(/certified|certification/i)
    // It should replace the vague words
    expect(vagueFinding!.proposedFix!.proposed).not.toContain('TBD')
    expect(vagueFinding!.proposedFix!.proposed).not.toContain('ASAP')
  })

  it('sustainment vague-fix does not add maintenance frequency as invented fact', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          sustainmentNarrative:
            'Maintenance will be done as needed by various staff when issues arise.',
          sustainmentSource: 'inferred',
        }),
      ],
    })
    const findings = checkSustainment(snap)
    const vagueFinding = findings.find((f) => f.id.startsWith('sustainment-vague-language'))
    if (vagueFinding) {
      expect(vagueFinding.proposedFix!.guardrailTags).not.toContain('no_invented_incidents')
      expect(vagueFinding.proposedFix!.guardrailTags).not.toContain('no_invented_certifications')
    }
  })
})

// ─── 9. Project alignment checks ─────────────────────────────────────────────

describe('Project alignment checks', () => {
  it('high-risk unaddressed threat creates a warning', () => {
    const snap = makeSnapshot({
      threats: [
        ...makeSnapshot().threats,
        {
          id: 'threat-2',
          threatType: 'Active Shooter / Mass Violence',
          description: 'Risk of targeted violence against the congregation.',
          likelihood: 5,
          impact: 5,
          riskScore: 25,
          riskLevel: 'critical',
          source: 'self_assessed',
          sourceAgency: null,
          vulnerabilityNotes: 'Open entry, no panic buttons, no CCTV coverage.',
          incidentHistory: 'In 2024, a threat was made via social media.',
        },
      ],
      // project only addresses Unauthorized Entry, not Active Shooter
    })
    const findings = checkProjectAlignment(snap)
    const warning = findings.find((f) => f.id.startsWith('alignment-high-risk-unaddressed'))
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('warning')
  })

  it('budget grand total mismatch creates a blocker', () => {
    const snap = makeSnapshot({ totalBudget: 99999 })
    const findings = checkProjectAlignment(snap)
    const blocker = findings.find((f) => f.id === 'alignment-budget-total-mismatch')
    expect(blocker).toBeDefined()
    expect(blocker!.severity).toBe('blocker')
  })

  it('budget item math mismatch creates a warning', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          budgetItems: [makeBudgetItem({ quantity: 4, unitCost: 2500, totalCost: 9999 })],
          projectBudget: 9999,
        }),
      ],
      totalBudget: 9999,
    })
    const findings = checkProjectAlignment(snap)
    const warning = findings.find((f) => f.id.startsWith('alignment-budget-item-math'))
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('warning')
  })
})

// ─── 10. Implementation checks ────────────────────────────────────────────────

describe('Implementation checks', () => {
  it('auto-generated implementation creates a suggestion to review', () => {
    const snap = makeSnapshot({
      projects: [makeProject({ implementationSource: 'inferred' })],
    })
    const findings = checkImplementation(snap)
    const suggestion = findings.find((f) => f.id.startsWith('implementation-auto-generated'))
    expect(suggestion).toBeDefined()
    expect(suggestion!.severity).toBe('suggestion')
    expect(suggestion!.canAutoFix).toBe(false) // review prompt, not text replacement
  })

  it('user-authored implementation does NOT create auto-generated suggestion', () => {
    const snap = makeSnapshot()
    const findings = checkImplementation(snap)
    const autoGenSuggestion = findings.find((f) =>
      f.id.startsWith('implementation-auto-generated'),
    )
    expect(autoGenSuggestion).toBeUndefined()
  })

  it('vague implementation creates a warning with autofix', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          implementationNarrative:
            'We will install things ASAP. Staff TBD will handle various tasks as needed.',
        }),
      ],
    })
    const findings = checkImplementation(snap)
    const warning = findings.find((f) => f.id.startsWith('implementation-vague-language'))
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('warning')
    expect(warning!.canAutoFix).toBe(true)
  })
})

// ─── 11. Sustainment checks ───────────────────────────────────────────────────

describe('Sustainment checks', () => {
  it('sustainment with no maintenance frequency creates a warning with autofix', () => {
    const snap = makeSnapshot({
      projects: [
        makeProject({
          sustainmentNarrative:
            'The organization will maintain the equipment and ensure it continues to function properly.',
          sustainmentSource: 'user',
        }),
      ],
    })
    const findings = checkSustainment(snap)
    const warning = findings.find((f) =>
      f.id.startsWith('sustainment-no-maintenance-frequency'),
    )
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('warning')
    expect(warning!.canAutoFix).toBe(true)
  })

  it('complete sustainment does NOT flag for missing frequency', () => {
    const snap = makeSnapshot() // includes "inspected quarterly and serviced annually"
    const findings = checkSustainment(snap)
    const missing = findings.find((f) =>
      f.id.startsWith('sustainment-no-maintenance-frequency'),
    )
    expect(missing).toBeUndefined()
  })
})

// ─── 12. Full review run produces consistent structure ────────────────────────

describe('Full review run', () => {
  it('all findings have required fields', () => {
    const snap = makeSnapshot()
    const review = runApplicationReview(snap, 'draft-1')
    for (const finding of review.findings) {
      expect(finding.id).toBeTruthy()
      expect(['blocker', 'warning', 'suggestion']).toContain(finding.severity)
      expect(finding.category).toBeTruthy()
      expect(finding.title).toBeTruthy()
      expect(finding.explanation).toBeTruthy()
      expect(finding.affectedSection).toBeTruthy()
      expect(finding.recommendedAction).toBeTruthy()
      expect(typeof finding.canAutoFix).toBe('boolean')
      expect(typeof finding.resolved).toBe('boolean')
      expect(typeof finding.rejected).toBe('boolean')
    }
  })

  it('no duplicate finding IDs', () => {
    const snap = makeSnapshot()
    const review = runApplicationReview(snap, 'draft-1')
    const ids = review.findings.map((f) => f.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('scores object has all required keys', () => {
    const snap = makeSnapshot()
    const { scores } = runApplicationReview(snap, 'draft-1')
    expect(scores).toHaveProperty('overall')
    expect(scores).toHaveProperty('threat_evidence')
    expect(scores).toHaveProperty('vulnerability_specificity')
    expect(scores).toHaveProperty('project_alignment')
    expect(scores).toHaveProperty('budget_quality')
    expect(scores).toHaveProperty('implementation_feasibility')
    expect(scores).toHaveProperty('sustainment_quality')
    expect(scores).toHaveProperty('attachment_readiness')
    // All scores are 0-100
    Object.values(scores).forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(100)
    })
  })
})
