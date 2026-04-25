import { describe, it, expect } from 'vitest'
import {
  detectProjectType,
  generateTimelineNarrative,
  generateSustainmentNarrative,
  generateProjectNarrativeDefaults,
  detectVagueText,
  type ProjectNarrativeInput,
  type TimelineData,
  type SustainmentData,
} from '@/lib/project-narrative-engine'
import { validateSnapshot } from '@/lib/export-validation'
import type { NarrativeSource } from '@/lib/project-narrative-engine'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeInput(
  overrides: Partial<ProjectNarrativeInput> = {},
): ProjectNarrativeInput {
  return {
    title: 'Access Control Upgrade',
    category: 'Physical Security',
    budgetItems: [
      { itemName: 'HID multiClass SE325 card reader', category: 'Equipment', vendorName: 'Allegion' },
    ],
    ...overrides,
  }
}

const baseTimeline: TimelineData = {
  procurementStartDaysAfterAward: 30,
  procurementDurationDays: 30,
  contractorSelectionRequired: true,
  permittingRequired: false,
  installationDurationDays: 14,
  testingDurationDays: 5,
  trainingRequired: true,
  trainingDurationDays: 2,
  finalDocumentationDays: 5,
  responsibleParty: 'Safety Team Lead',
}

const baseSustainment: SustainmentData = {
  maintenanceOwner: 'Facilities Manager',
  inspectionFrequency: 'quarterly',
  vendorSupport: true,
  warrantyTermYears: 3,
  budgetOwner: 'Executive Director',
  trainingRefreshFrequency: 'annually',
  recordkeepingRequired: true,
}

// ─── 1. Project type detection ────────────────────────────────────────────────

describe('detectProjectType', () => {
  it('detects access_control from title', () => {
    const type = detectProjectType(makeInput({ title: 'Access Control System Installation' }))
    expect(type).toBe('access_control')
  })

  it('detects access_control from budget item (HID card reader)', () => {
    const type = detectProjectType(
      makeInput({
        title: 'Physical Security Upgrade',
        budgetItems: [{ itemName: 'HID card reader model SE325', category: 'Equipment' }],
      }),
    )
    expect(type).toBe('access_control')
  })

  it('detects cctv from title', () => {
    const type = detectProjectType(makeInput({ title: 'CCTV Surveillance System', category: 'Technology' }))
    expect(type).toBe('cctv')
  })

  it('detects cctv from budget items containing camera', () => {
    const type = detectProjectType(
      makeInput({
        title: 'Video Monitoring',
        budgetItems: [{ itemName: 'Bosch IP dome camera', category: 'Equipment' }],
      }),
    )
    expect(type).toBe('cctv')
  })

  it('detects lighting from title', () => {
    const type = detectProjectType(
      makeInput({ title: 'Exterior Lighting Upgrade', category: 'Physical Security' }),
    )
    expect(type).toBe('lighting')
  })

  it('detects lighting from budget item (LED fixtures)', () => {
    const type = detectProjectType(
      makeInput({
        title: 'Perimeter Security',
        budgetItems: [{ itemName: 'LED exterior security fixture 150W', category: 'Equipment' }],
      }),
    )
    expect(type).toBe('lighting')
  })

  it('falls back to general when no patterns match', () => {
    const type = detectProjectType(
      makeInput({
        title: 'Security Assessment',
        category: undefined,
        budgetItems: [],
      }),
    )
    expect(type).toBe('general')
  })
})

// ─── 2. Timeline narrative generation ────────────────────────────────────────

describe('generateTimelineNarrative', () => {
  it('includes procurement start days', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, procurementStartDaysAfterAward: 45 })
    expect(text).toContain('45 days')
  })

  it('includes installation duration', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, installationDurationDays: 21 })
    expect(text).toContain('21 days')
  })

  it('mentions contractor selection when required', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, contractorSelectionRequired: true })
    expect(text.toLowerCase()).toContain('contractor')
  })

  it('omits contractor selection when not required', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, contractorSelectionRequired: false })
    expect(text.toLowerCase()).not.toContain('contractor selection')
  })

  it('mentions permitting when required', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, permittingRequired: true })
    expect(text.toLowerCase()).toContain('permit')
  })

  it('omits permitting language when not required', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, permittingRequired: false })
    expect(text.toLowerCase()).not.toContain('permit')
  })

  it('includes testing duration', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, testingDurationDays: 7 })
    expect(text).toContain('7 days')
  })

  it('mentions staff training when required', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, trainingRequired: true, trainingDurationDays: 3 })
    expect(text.toLowerCase()).toContain('training')
    expect(text).toContain('3 days')
  })

  it('omits training when not required', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, trainingRequired: false })
    expect(text.toLowerCase()).not.toContain('staff training')
  })

  it('includes final documentation days', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, finalDocumentationDays: 7 })
    expect(text).toContain('7 days')
  })

  it('includes the responsible party', () => {
    const text = generateTimelineNarrative({ ...baseTimeline, responsibleParty: 'Director of Operations' })
    expect(text).toContain('Director of Operations')
  })

  it('produces a non-empty string for all defaults', () => {
    const text = generateTimelineNarrative(baseTimeline)
    expect(text.length).toBeGreaterThan(100)
  })
})

// ─── 3. Sustainment narrative generation ─────────────────────────────────────

describe('generateSustainmentNarrative', () => {
  it('includes the maintenance owner', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'access_control')
    expect(text).toContain('Facilities Manager')
  })

  it('includes inspection frequency', () => {
    const text = generateSustainmentNarrative({ ...baseSustainment, inspectionFrequency: 'monthly' }, 'general')
    expect(text.toLowerCase()).toContain('monthly')
  })

  it('includes warranty term', () => {
    const text = generateSustainmentNarrative({ ...baseSustainment, warrantyTermYears: 5 }, 'general')
    expect(text).toContain('5 year')
  })

  it('omits vendor/warranty language when vendorSupport is false and warrantyTermYears is 0', () => {
    const text = generateSustainmentNarrative(
      { ...baseSustainment, vendorSupport: false, warrantyTermYears: 0 },
      'general',
    )
    expect(text.toLowerCase()).not.toContain('vendor support and warranty')
  })

  it('includes budget owner', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'general')
    expect(text).toContain('Executive Director')
  })

  it('includes recordkeeping requirement when set', () => {
    const text = generateSustainmentNarrative({ ...baseSustainment, recordkeepingRequired: true }, 'general')
    expect(text.toLowerCase()).toContain('records')
  })
})

// ─── 4. Project-specific language ────────────────────────────────────────────

describe('Project-type-specific sustainment language', () => {
  it('lighting — mentions fixture inspection and photocells', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'lighting')
    expect(text.toLowerCase()).toContain('fixture')
    expect(text.toLowerCase()).toContain('photocell')
  })

  it('lighting — mentions bollards or perimeter elements', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'lighting')
    expect(text.toLowerCase()).toContain('bollard')
  })

  it('cctv — mentions NVR storage', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'cctv')
    expect(text.toLowerCase()).toContain('nvr')
  })

  it('cctv — mentions firmware updates', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'cctv')
    expect(text.toLowerCase()).toContain('firmware')
  })

  it('cctv — mentions user access audits', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'cctv')
    expect(text.toLowerCase()).toContain('access credentials')
  })

  it('access_control — mentions credential audits', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'access_control')
    expect(text.toLowerCase()).toContain('credential')
  })

  it('access_control — mentions door hardware testing', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'access_control')
    expect(text.toLowerCase()).toContain('door hardware')
  })

  it('access_control — mentions intercom testing', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'access_control')
    expect(text.toLowerCase()).toContain('intercom')
  })

  it('access_control — mentions panic button', () => {
    const text = generateSustainmentNarrative(baseSustainment, 'access_control')
    expect(text.toLowerCase()).toContain('panic button')
  })
})

// ─── 5. generateProjectNarrativeDefaults priority chain ──────────────────────

describe('generateProjectNarrativeDefaults — priority chain', () => {
  it('uses user-authored timeline override when present', () => {
    const input = makeInput({ timelineNarrative: 'Custom timeline written by the user.' })
    const result = generateProjectNarrativeDefaults(input)
    expect(result.timelineNarrative).toBe('Custom timeline written by the user.')
    expect(result.timelineSource).toBe('user')
  })

  it('uses user-authored sustainment override when present', () => {
    const input = makeInput({ sustainmentNarrative: 'Custom sustainment plan.' })
    const result = generateProjectNarrativeDefaults(input)
    expect(result.sustainmentNarrative).toBe('Custom sustainment plan.')
    expect(result.sustainmentSource).toBe('user')
  })

  it('uses structured timelineData when no user override', () => {
    const input = makeInput({ timelineData: { ...baseTimeline, installationDurationDays: 99 } })
    const result = generateProjectNarrativeDefaults(input)
    expect(result.timelineNarrative).toContain('99 days')
    expect(result.timelineSource).toBe('structured')
  })

  it('uses structured sustainmentData when no user override', () => {
    const input = makeInput({
      sustainmentData: { ...baseSustainment, maintenanceOwner: 'Custom Owner' },
    })
    const result = generateProjectNarrativeDefaults(input)
    expect(result.sustainmentNarrative).toContain('Custom Owner')
    expect(result.sustainmentSource).toBe('structured')
  })

  it('infers from project type when no user or structured data', () => {
    // Provide only CCTV-specific data so access_control patterns from default budgetItems don't win
    const input = makeInput({
      title: 'CCTV Surveillance System',
      category: 'Technology',
      budgetItems: [{ itemName: 'Bosch IP dome camera', category: 'Equipment', vendorName: 'Bosch' }],
    })
    const result = generateProjectNarrativeDefaults(input)
    expect(result.timelineSource).toBe('inferred')
    expect(result.sustainmentSource).toBe('inferred')
    expect(result.projectType).toBe('cctv')
  })

  it('always produces non-empty timeline narrative', () => {
    const input = makeInput({ title: 'Generic security project', budgetItems: [] })
    const result = generateProjectNarrativeDefaults(input)
    expect(result.timelineNarrative.length).toBeGreaterThan(50)
  })

  it('always produces non-empty sustainment narrative', () => {
    const input = makeInput({ title: 'Generic security project', budgetItems: [] })
    const result = generateProjectNarrativeDefaults(input)
    expect(result.sustainmentNarrative.length).toBeGreaterThan(50)
  })

  it('marks isGenerated=true when at least one section is not user-authored', () => {
    const input = makeInput() // inferred
    const result = generateProjectNarrativeDefaults(input)
    expect(result.isGenerated).toBe(true)
  })

  it('marks isGenerated=false when both sections are user-authored', () => {
    const input = makeInput({
      timelineNarrative: 'Custom timeline.',
      sustainmentNarrative: 'Custom sustainment.',
    })
    const result = generateProjectNarrativeDefaults(input)
    expect(result.isGenerated).toBe(false)
  })

  it('warns when no vendor names are present in budget items', () => {
    const input = makeInput({
      budgetItems: [{ itemName: 'Card reader', category: 'Equipment', vendorName: null }],
    })
    const result = generateProjectNarrativeDefaults(input)
    expect(result.generationWarnings.length).toBeGreaterThan(0)
    expect(result.generationWarnings[0].toLowerCase()).toContain('vendor')
  })

  it('does NOT warn about vendors when vendor names are present', () => {
    const input = makeInput({
      budgetItems: [{ itemName: 'HID card reader', category: 'Equipment', vendorName: 'Allegion' }],
    })
    const result = generateProjectNarrativeDefaults(input)
    const vendorWarnings = result.generationWarnings.filter((w) => w.toLowerCase().includes('vendor'))
    expect(vendorWarnings).toHaveLength(0)
  })
})

// ─── 6. No "manual" placeholder language in export ───────────────────────────

describe('No manual placeholder language in generated output', () => {
  const MANUAL_PHRASES = [
    'complete manually',
    'fill in',
    'tbd',
    'to be determined',
    'write narrative',
    'not captured by',
  ]

  for (const phrase of MANUAL_PHRASES) {
    it(`generated timeline does not contain "${phrase}"`, () => {
      const result = generateProjectNarrativeDefaults(makeInput())
      expect(result.timelineNarrative.toLowerCase()).not.toContain(phrase)
    })

    it(`generated sustainment does not contain "${phrase}"`, () => {
      const result = generateProjectNarrativeDefaults(makeInput())
      expect(result.sustainmentNarrative.toLowerCase()).not.toContain(phrase)
    })
  }
})

// ─── 7. Vague text detection ──────────────────────────────────────────────────

describe('detectVagueText', () => {
  it('flags TBD', () => expect(detectVagueText('Timeline TBD')).toHaveLength(1))
  it('flags "to be determined"', () =>
    expect(detectVagueText('Schedule to be determined.')).toHaveLength(1))
  it('flags "will be done"', () =>
    expect(detectVagueText('Installation will be done at some point.')).toHaveLength(1))
  it('returns empty for clean professional text', () => {
    const text =
      'Upon award, the organization will initiate procurement within 30 days. Installation is expected to be completed within 14 days.'
    expect(detectVagueText(text)).toHaveLength(0)
  })
})

// ─── 8. Checklist: status transitions ────────────────────────────────────────

// Minimal snapshot factories for the status tests

function makeStatusProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    title: 'Access Control Upgrade',
    category: 'Physical Security',
    problemStatement: 'Entry points lack control.',
    proposedSolution: 'Install card readers.',
    riskReductionRationale: 'Reduces unauthorized entry risk.',
    implementationNotes: 'Phase 1 Q1.',
    priority: 1,
    status: 'draft',
    projectBudget: 10000,
    budgetItems: [
      {
        id: 'b1',
        itemName: 'HID card reader SE325',
        category: 'Equipment',
        quantity: 1,
        unitCost: 10000,
        totalCost: 10000,
        vendorName: 'Allegion',
        justification: null,
      },
    ],
    linkedThreatTypes: ['Unauthorized Entry'],
    timelineNarrative: 'Upon award the organization will procure within 30 days.',
    sustainmentNarrative: 'The organization will maintain the system quarterly.',
    timelineSource: 'user' as NarrativeSource,
    sustainmentSource: 'user' as NarrativeSource,
    generationWarnings: [] as string[],
    ...overrides,
  }
}

function makeStatusSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    capturedAt: new Date().toISOString(),
    organization: {
      id: 'org-1',
      name: 'Grace Church',
      denomination: 'Protestant',
      address: '100 Main St',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
      contactName: 'Rev. Smith',
      contactEmail: 'smith@church.org',
      contactPhone: '(312) 555-0100',
      einOrTaxId: '36-1234567',
    },
    site: {
      id: 'site-1',
      siteName: 'Grace Church — Main Campus',
      address: '100 Main St, Chicago, IL 60601',
    },
    threats: [
      {
        id: 't1',
        threatType: 'Vandalism',
        likelihood: 4,
        impact: 4,
        riskScore: 16,
        riskLevel: 'high',
        source: 'self_assessed',
      },
    ],
    securityMeasures: [],
    projects: [makeStatusProject()],
    narratives: { threat_overview: 'Known threats exist.' },
    totalBudget: 10000,
    highRiskThreatCount: 1,
    ...overrides,
  }
}

describe('Checklist status with generated narratives', () => {
  it('is review-ready when all sections are populated (including generated timeline/sustainment)', () => {
    const result = validateSnapshot(makeStatusSnapshot())
    expect(result.errorCount).toBe(0)
  })

  it('has no PROJ_NO_TIMELINE warning when narrative is populated', () => {
    const result = validateSnapshot(makeStatusSnapshot())
    const missing = result.issues.filter((i: { code: string }) => i.code === 'PROJ_NO_TIMELINE')
    expect(missing).toHaveLength(0)
  })

  it('has no PROJ_NO_SUSTAINMENT warning when narrative is populated', () => {
    const result = validateSnapshot(makeStatusSnapshot())
    const missing = result.issues.filter((i: { code: string }) => i.code === 'PROJ_NO_SUSTAINMENT')
    expect(missing).toHaveLength(0)
  })

  it('adds PROJ_TIMELINE_AUTO_GENERATED info when source is inferred', () => {
    const snap = makeStatusSnapshot({
      projects: [makeStatusProject({ timelineSource: 'inferred' })],
    })
    const result = validateSnapshot(snap)
    const autoIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'PROJ_TIMELINE_AUTO_GENERATED',
    )
    expect(autoIssues.length).toBeGreaterThanOrEqual(1)
  })

  it('does not add PROJ_TIMELINE_AUTO_GENERATED when source is user', () => {
    const snap = makeStatusSnapshot({
      projects: [makeStatusProject({ timelineSource: 'user' })],
    })
    const result = validateSnapshot(snap)
    const autoIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'PROJ_TIMELINE_AUTO_GENERATED',
    )
    expect(autoIssues).toHaveLength(0)
  })
})
