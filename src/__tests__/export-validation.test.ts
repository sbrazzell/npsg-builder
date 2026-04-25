import { describe, it, expect } from 'vitest'
import {
  validateSnapshot,
  isGenericItemName,
  isPlaceholder,
} from '@/lib/export-validation'
import type { FilingSnapshot } from '@/actions/filings'

// ─── Snapshot factory ─────────────────────────────────────────────────────────
// Builds a minimal but structurally valid FilingSnapshot.  Individual tests
// override only the fields they care about.

function makeProject(
  overrides: Partial<FilingSnapshot['projects'][number]> = {},
): FilingSnapshot['projects'][number] {
  return {
    id: 'proj-1',
    title: 'Access Control Upgrade',
    category: 'Physical Security',
    problemStatement: 'The main entrance lacks access control.',
    proposedSolution: 'Install HID card readers at all entry points.',
    riskReductionRationale: 'Reduces unauthorized-entry risk from high to low.',
    implementationNotes: 'Phase 1 Q1, Phase 2 Q2.',
    priority: 1,
    status: 'draft',
    projectBudget: 10000,
    budgetItems: [
      {
        id: 'bi-1',
        itemName: 'HID multiClass SE325 card reader',
        category: 'Equipment',
        quantity: 4,
        unitCost: 2500,
        totalCost: 10000,
        vendorName: 'Allegion',
        justification: 'Replaces legacy key-and-lock system.',
      },
    ],
    linkedThreatTypes: ['Unauthorized Entry'],
    // Implementation, Timeline & Sustainment — engine-generated defaults
    implementationNarrative:
      'Following award, the organization will coordinate with Allegion for procurement and delivery of card readers.',
    implementationSource: 'inferred',
    timelineNarrative:
      'Upon award and completion of required approvals, the organization will initiate procurement within approximately 30 days.',
    sustainmentNarrative:
      'The organization is committed to sustaining this investment through routine maintenance and periodic inspection.',
    timelineSource: 'inferred',
    sustainmentSource: 'inferred',
    generationWarnings: [],
    ...overrides,
  }
}

function makeSnapshot(
  overrides: Partial<FilingSnapshot> = {},
): FilingSnapshot {
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
    },
    threats: [
      {
        id: 'threat-1',
        threatType: 'Antisemitic / Anti-Religious Vandalism',
        likelihood: 4,
        impact: 4,
        riskScore: 16,
        riskLevel: 'high',
        source: 'self_assessed',
      },
    ],
    securityMeasures: [],
    projects: [project],
    narratives: {
      threat_overview: 'The site has experienced repeated acts of vandalism.',
    },
    totalBudget: 10000,
    highRiskThreatCount: 1,
    ...overrides,
  }
}

// ─── 1. Blank congressional districts trigger checklist warnings ───────────────

describe('Congressional district placeholder detection', () => {
  it('flags blank congressional district fields as info issues', () => {
    const result = validateSnapshot(makeSnapshot())
    const districtCodes = result.issues
      .filter((i) => i.code.includes('DISTRICT'))
      .map((i) => i.code)

    expect(districtCodes).toContain('SF424_PLACEHOLDER_DISTRICT_APP')
    expect(districtCodes).toContain('SF424_PLACEHOLDER_DISTRICT_PROJ')
  })

  it('marks district issues as info (NOFO-dependent), not error', () => {
    const result = validateSnapshot(makeSnapshot())
    const districtIssues = result.issues.filter((i) => i.code.includes('DISTRICT'))
    districtIssues.forEach((issue) => {
      expect(issue.severity).toBe('info')
    })
  })

  it('flags blank project start and end dates as info issues', () => {
    const result = validateSnapshot(makeSnapshot())
    const dateCodes = result.issues.map((i) => i.code)
    expect(dateCodes).toContain('SF424_PLACEHOLDER_START_DATE')
    expect(dateCodes).toContain('SF424_PLACEHOLDER_END_DATE')
  })
})

// ─── 2. All 3 projects include Implementation Plan, Timeline, Sustainment ─────

describe('Project section completeness', () => {
  it('does NOT flag a project that has an implementation plan', () => {
    const result = validateSnapshot(makeSnapshot())
    const implIssues = result.issues.filter(
      (i) => i.code === 'PROJ_NO_IMPLEMENTATION',
    )
    expect(implIssues).toHaveLength(0)
  })

  it('flags a project missing an implementation plan (no generated narrative)', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject({ implementationNarrative: '' })],
    })
    const result = validateSnapshot(snapshot)
    const implIssues = result.issues.filter(
      (i) => i.code === 'PROJ_NO_IMPLEMENTATION',
    )
    expect(implIssues.length).toBeGreaterThanOrEqual(1)
    expect(implIssues[0].severity).toBe('warning')
  })

  it('does NOT flag timeline when narrative is present (auto-generated)', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject(), makeProject({ id: 'proj-2', title: 'CCTV Upgrade' }), makeProject({ id: 'proj-3', title: 'Perimeter Fencing' })],
    })
    const result = validateSnapshot(snapshot)
    const timelineMissingIssues = result.issues.filter(
      (i) => i.code === 'PROJ_NO_TIMELINE',
    )
    // With generated narratives present, PROJ_NO_TIMELINE should not fire
    expect(timelineMissingIssues).toHaveLength(0)
  })

  it('does NOT flag sustainment when narrative is present (auto-generated)', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject(), makeProject({ id: 'proj-2', title: 'CCTV Upgrade' }), makeProject({ id: 'proj-3', title: 'Perimeter Fencing' })],
    })
    const result = validateSnapshot(snapshot)
    const sustainMissingIssues = result.issues.filter(
      (i) => i.code === 'PROJ_NO_SUSTAINMENT',
    )
    expect(sustainMissingIssues).toHaveLength(0)
  })

  it('flags timeline as warning when narrative is blank', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject({ timelineNarrative: '' })],
    })
    const result = validateSnapshot(snapshot)
    const timelineIssues = result.issues.filter((i) => i.code === 'PROJ_NO_TIMELINE')
    expect(timelineIssues).toHaveLength(1)
    expect(timelineIssues[0].severity).toBe('warning')
  })

  it('flags sustainment as warning when narrative is blank', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject({ sustainmentNarrative: '' })],
    })
    const result = validateSnapshot(snapshot)
    const sustainIssues = result.issues.filter((i) => i.code === 'PROJ_NO_SUSTAINMENT')
    expect(sustainIssues).toHaveLength(1)
    expect(sustainIssues[0].severity).toBe('warning')
  })

  it('adds info issue when timeline was auto-generated from inference', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject({ timelineSource: 'inferred' })],
    })
    const result = validateSnapshot(snapshot)
    const autoIssues = result.issues.filter((i) => i.code === 'PROJ_TIMELINE_AUTO_GENERATED')
    expect(autoIssues).toHaveLength(1)
    expect(autoIssues[0].severity).toBe('info')
  })

  it('does NOT add auto-generated info issue when timeline source is user', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject({ timelineSource: 'user' })],
    })
    const result = validateSnapshot(snapshot)
    const autoIssues = result.issues.filter((i) => i.code === 'PROJ_TIMELINE_AUTO_GENERATED')
    expect(autoIssues).toHaveLength(0)
  })
})

// ─── 3. Budget math integrity ─────────────────────────────────────────────────

describe('Budget math integrity', () => {
  it('passes when line items match snapshot total', () => {
    const result = validateSnapshot(makeSnapshot())
    const mathIssues = result.issues.filter(
      (i) => i.code === 'BUDGET_MATH_MISMATCH',
    )
    expect(mathIssues).toHaveLength(0)
  })

  it('fails when line items do not match snapshot total', () => {
    const snapshot = makeSnapshot({ totalBudget: 99999 }) // intentional mismatch
    const result = validateSnapshot(snapshot)
    const mathIssues = result.issues.filter(
      (i) => i.code === 'BUDGET_MATH_MISMATCH',
    )
    expect(mathIssues).toHaveLength(1)
    expect(mathIssues[0].severity).toBe('error')
  })

  it('passes when project budgets sum to the total across 3 projects', () => {
    const p1 = makeProject({ id: 'p1', projectBudget: 5000, budgetItems: [{ id: 'b1', itemName: 'Camera', category: 'Technology', quantity: 2, unitCost: 2500, totalCost: 5000, vendorName: null, justification: null }] })
    const p2 = makeProject({ id: 'p2', projectBudget: 3000, budgetItems: [{ id: 'b2', itemName: 'HID card reader', category: 'Equipment', quantity: 1, unitCost: 3000, totalCost: 3000, vendorName: null, justification: null }] })
    const p3 = makeProject({ id: 'p3', projectBudget: 2000, budgetItems: [{ id: 'b3', itemName: 'Training session', category: 'Training', quantity: 1, unitCost: 2000, totalCost: 2000, vendorName: null, justification: null }] })
    const snapshot = makeSnapshot({ projects: [p1, p2, p3], totalBudget: 10000 })
    const result = validateSnapshot(snapshot)
    const mathIssues = result.issues.filter((i) => i.code === 'BUDGET_MATH_MISMATCH')
    expect(mathIssues).toHaveLength(0)
  })
})

// ─── 4. Generic item names trigger a warning ──────────────────────────────────

describe('Generic budget item name detection', () => {
  it.each([
    'Security equipment',
    'Equipment',
    'Camera',
    'Cameras',
    'Door hardware',
    'Access control',
    'Lock',
    'Locks',
    'Other',
    'Miscellaneous',
    'Hardware',
    'Software',
    'Security system',
  ])('flags "%s" as a generic item name', (name) => {
    expect(isGenericItemName(name)).toBe(true)
  })

  it.each([
    'HID multiClass SE325 card reader',
    'Bosch FLEXIDOME 5100i IR dome camera',
    'Alarm.com professional monitoring subscription (12 mo)',
    'Lenel S2 access control panel, 2-door',
    'DMP XR150 alarm panel with cellular backup',
  ])('does NOT flag "%s" as generic', (name) => {
    expect(isGenericItemName(name)).toBe(false)
  })

  it('raises a BUDGET_GENERIC_ITEM warning for generic items in the snapshot', () => {
    const project = makeProject({
      budgetItems: [
        { id: 'b1', itemName: 'Security equipment', category: 'Equipment', quantity: 1, unitCost: 5000, totalCost: 5000, vendorName: null, justification: null },
      ],
    })
    const snapshot = makeSnapshot({ projects: [project], totalBudget: 5000 })
    const result = validateSnapshot(snapshot)
    const genericIssues = result.issues.filter((i) => i.code === 'BUDGET_GENERIC_ITEM')
    expect(genericIssues.length).toBeGreaterThanOrEqual(1)
    expect(genericIssues[0].severity).toBe('warning')
  })
})

// ─── 5. Document status — incomplete when required fields blank ───────────────

describe('Document status', () => {
  it('is incomplete when org has no EIN', () => {
    const snapshot = makeSnapshot({
      organization: { ...makeSnapshot().organization, einOrTaxId: null },
    })
    const result = validateSnapshot(snapshot)
    expect(result.status).toBe('incomplete')
  })

  it('is incomplete when org has no contact name', () => {
    const snapshot = makeSnapshot({
      organization: { ...makeSnapshot().organization, contactName: null },
    })
    const result = validateSnapshot(snapshot)
    expect(result.status).toBe('incomplete')
  })

  it('is review-ready when only warnings exist (no errors)', () => {
    // Auth rep fields (title, sig date) are warnings; no hard errors → review-ready
    const snapshot = makeSnapshot()
    const result = validateSnapshot(snapshot)
    expect(result.errorCount).toBe(0)
    expect(result.warningCount).toBeGreaterThan(0) // SF424_PLACEHOLDER_REP_TITLE, SF424_PLACEHOLDER_SIG_DATE
    expect(result.status).toBe('review-ready')
  })

  it('is never submission-ready because NOFO-dependent info issues always exist', () => {
    // A snapshot with user-authored timelines (no auto-gen info) still has NOFO-dependent info items
    const snapshot = makeSnapshot({
      projects: [makeProject({ timelineSource: 'user', sustainmentSource: 'user', generationWarnings: [] })],
    })
    const result = validateSnapshot(snapshot)
    // District + dates are always info-flagged → at most review-ready
    expect(result.status).not.toBe('submission-ready')
  })

  it('error count matches number of error-severity issues', () => {
    const snapshot = makeSnapshot({
      organization: { ...makeSnapshot().organization, einOrTaxId: null, contactName: null },
    })
    const result = validateSnapshot(snapshot)
    const counted = result.issues.filter((i) => i.severity === 'error').length
    expect(result.errorCount).toBe(counted)
  })
})

// ─── 6. isPlaceholder helper ──────────────────────────────────────────────────

describe('isPlaceholder', () => {
  it('returns true for null', () => expect(isPlaceholder(null)).toBe(true))
  it('returns true for empty string', () => expect(isPlaceholder('')).toBe(true))
  it('returns true for whitespace', () => expect(isPlaceholder('   ')).toBe(true))
  it('returns true for "(Enter district — required at submission)"', () =>
    expect(isPlaceholder('(Enter district — required at submission)')).toBe(true))
  it('returns true for "(Enter when NOFO announces period of performance)"', () =>
    expect(isPlaceholder('(Enter when NOFO announces period of performance)')).toBe(true))
  it('returns true for "(Complete at submission)"', () =>
    expect(isPlaceholder('(Complete at submission)')).toBe(true))
  it('returns false for a real value', () =>
    expect(isPlaceholder('36-4821047')).toBe(false))
})
