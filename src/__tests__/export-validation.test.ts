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

  it('flags a project missing an implementation plan', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject({ implementationNotes: '' })],
    })
    const result = validateSnapshot(snapshot)
    const implIssues = result.issues.filter(
      (i) => i.code === 'PROJ_NO_IMPLEMENTATION',
    )
    expect(implIssues.length).toBeGreaterThanOrEqual(1)
    expect(implIssues[0].severity).toBe('warning')
  })

  it('always flags Timeline as a system-gap info issue for every project', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject(), makeProject({ id: 'proj-2', title: 'CCTV Upgrade' }), makeProject({ id: 'proj-3', title: 'Perimeter Fencing' })],
    })
    const result = validateSnapshot(snapshot)
    const timelineIssues = result.issues.filter(
      (i) => i.code === 'PROJ_NO_TIMELINE',
    )
    // One per project
    expect(timelineIssues).toHaveLength(3)
    timelineIssues.forEach((i) => expect(i.severity).toBe('info'))
  })

  it('always flags Sustainment as a system-gap info issue for every project', () => {
    const snapshot = makeSnapshot({
      projects: [makeProject(), makeProject({ id: 'proj-2', title: 'CCTV Upgrade' }), makeProject({ id: 'proj-3', title: 'Perimeter Fencing' })],
    })
    const result = validateSnapshot(snapshot)
    const sustainIssues = result.issues.filter(
      (i) => i.code === 'PROJ_NO_SUSTAINMENT',
    )
    expect(sustainIssues).toHaveLength(3)
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
    // Drop implementation notes → warning, but no errors
    const snapshot = makeSnapshot({
      projects: [makeProject({ implementationNotes: null })],
    })
    const result = validateSnapshot(snapshot)
    expect(result.errorCount).toBe(0)
    expect(result.warningCount).toBeGreaterThan(0)
    expect(result.status).toBe('review-ready')
  })

  it('is never submission-ready because NOFO-dependent info issues always exist', () => {
    // A "perfect" org snapshot still has NOFO-dependent info items
    const result = validateSnapshot(makeSnapshot())
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
