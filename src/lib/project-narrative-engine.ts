/**
 * project-narrative-engine.ts
 *
 * Generates formal, FEMA-appropriate "Estimated Timeline / Milestones" and
 * "Sustainment / Maintenance Plan" narrative paragraphs for NSGP Investment
 * Justification documents.
 *
 * Priority chain (highest → lowest):
 *   1. User-authored narrative override (stored on the project directly)
 *   2. Structured data fields (TimelineData / SustainmentData) the user saved
 *   3. Auto-inferred defaults derived from project title, category, and budget items
 *
 * The engine always produces a narrative — it never returns an empty string.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export type ProjectType = 'lighting' | 'cctv' | 'access_control' | 'general'

export type InspectionFrequency = 'monthly' | 'quarterly' | 'annually'
export type TrainingRefreshFrequency = 'annually' | 'biannually' | 'as_needed'
export type NarrativeSource = 'user' | 'structured' | 'inferred'

/** Structured timeline inputs — stored as JSON in timelineJson column */
export interface TimelineData {
  procurementStartDaysAfterAward: number    // default 30
  procurementDurationDays: number           // default 30
  contractorSelectionRequired: boolean
  permittingRequired: boolean
  installationDurationDays: number
  testingDurationDays: number               // default 5
  trainingRequired: boolean                 // default true
  trainingDurationDays: number              // default 2
  finalDocumentationDays: number            // default 5
  responsibleParty: string
}

/** Structured sustainment inputs — stored as JSON in sustainmentJson column */
export interface SustainmentData {
  maintenanceOwner: string
  inspectionFrequency: InspectionFrequency
  vendorSupport: boolean
  warrantyTermYears: number
  budgetOwner: string
  trainingRefreshFrequency: TrainingRefreshFrequency
  recordkeepingRequired: boolean            // default true
}

/** Minimal project shape the engine needs — matches FilingSnapshot project fields */
export interface ProjectNarrativeInput {
  title: string
  category?: string | null
  timelineNarrative?: string | null
  sustainmentNarrative?: string | null
  timelineData?: TimelineData | null
  sustainmentData?: SustainmentData | null
  budgetItems: Array<{
    itemName: string
    category?: string | null
    vendorName?: string | null
    quantity?: number
    totalCost?: number
  }>
}

export interface ProjectNarrativeResult {
  timelineNarrative: string
  sustainmentNarrative: string
  projectType: ProjectType
  timelineSource: NarrativeSource
  sustainmentSource: NarrativeSource
  /** True when at least one narrative was produced from engine defaults (not user input) */
  isGenerated: boolean
  generationWarnings: string[]
}

// ─── Detection patterns ───────────────────────────────────────────────────────

const LIGHTING_PATTERNS: RegExp[] = [
  /\blight(s|ing|ed)?\b/i,
  /\bLED\b/,
  /\billuminat(e|ion|ed)\b/i,
  /\bperimeter\b/i,
  /\bbollard/i,
  /\bbarrier/i,
  /\bfixture/i,
  /\bfloodlight/i,
  /\bsecurity light/i,
  /\bphotocell/i,
  /\bexterior light/i,
]

const CCTV_PATTERNS: RegExp[] = [
  /\bCCTV\b/,
  /\bcamera(s)?\b/i,
  /\bsurveillance\b/i,
  /\bvideo\b/i,
  /\bNVR\b/,
  /\bDVR\b/,
  /\brecorder\b/i,
  /\bIP camera\b/i,
  /\bdome camera\b/i,
  /\bbullet camera\b/i,
  /\bPTZ\b/,
]

const ACCESS_CONTROL_PATTERNS: RegExp[] = [
  /\baccess control\b/i,
  /\bcard reader\b/i,
  /\bkeycard\b/i,
  /\bkey fob\b/i,
  /\bcredential(s)?\b/i,
  /\bHID\b/,
  /\bintercom\b/i,
  /\bmagloc?k\b/i,
  /\bpanic.{0,10}button\b/i,
  /\bturnstile\b/i,
  /\belectronic.{0,10}(door|lock|latch)\b/i,
  /\bdoor.{0,10}access\b/i,
  /\bentry.{0,10}control\b/i,
  /\bbuzzer.{0,10}entry\b/i,
]

// ─── Project type detection ───────────────────────────────────────────────────

export function detectProjectType(project: ProjectNarrativeInput): ProjectType {
  const corpus = [
    project.title,
    project.category ?? '',
    ...project.budgetItems.map((b) => `${b.itemName} ${b.category ?? ''}`),
  ]
    .join(' ')
    .toLowerCase()

  const score = (patterns: RegExp[]): number =>
    patterns.reduce((n, re) => n + (re.test(corpus) ? 1 : 0), 0)

  const scores: Record<ProjectType, number> = {
    lighting: score(LIGHTING_PATTERNS),
    cctv: score(CCTV_PATTERNS),
    access_control: score(ACCESS_CONTROL_PATTERNS),
    general: 0,
  }

  const best = (Object.keys(scores) as ProjectType[]).reduce((a, b) =>
    scores[b] > scores[a] ? b : a,
  )

  return scores[best] > 0 ? best : 'general'
}

// ─── Default value generators ─────────────────────────────────────────────────

function defaultTimeline(type: ProjectType): TimelineData {
  const base: TimelineData = {
    procurementStartDaysAfterAward: 30,
    procurementDurationDays: 30,
    contractorSelectionRequired: true,
    permittingRequired: false,
    installationDurationDays: 14,
    testingDurationDays: 5,
    trainingRequired: true,
    trainingDurationDays: 2,
    finalDocumentationDays: 5,
    responsibleParty: 'Facility Administrator / Safety Team Lead',
  }
  switch (type) {
    case 'lighting':
      return { ...base, installationDurationDays: 21, permittingRequired: true }
    case 'cctv':
      return { ...base, installationDurationDays: 14, testingDurationDays: 5 }
    case 'access_control':
      return { ...base, installationDurationDays: 14, testingDurationDays: 7 }
    default:
      return base
  }
}

function defaultSustainment(type: ProjectType): SustainmentData {
  const base: SustainmentData = {
    maintenanceOwner: 'Facility Administrator / Safety Team Lead',
    inspectionFrequency: 'quarterly',
    vendorSupport: true,
    warrantyTermYears: 3,
    budgetOwner: 'Executive Director / Finance Committee',
    trainingRefreshFrequency: 'annually',
    recordkeepingRequired: true,
  }
  switch (type) {
    case 'lighting':
      return { ...base, inspectionFrequency: 'quarterly', warrantyTermYears: 3 }
    case 'cctv':
      return {
        ...base,
        maintenanceOwner: 'Security Coordinator / IT Administrator',
        inspectionFrequency: 'quarterly',
        warrantyTermYears: 3,
      }
    case 'access_control':
      return {
        ...base,
        maintenanceOwner: 'Security Coordinator / Facilities Manager',
        inspectionFrequency: 'monthly',
        warrantyTermYears: 5,
      }
    default:
      return base
  }
}

// ─── Narrative generators ─────────────────────────────────────────────────────

function formatFrequency(f: InspectionFrequency): string {
  return f === 'monthly' ? 'monthly' : f === 'quarterly' ? 'quarterly' : 'annual'
}

function formatTrainingRefresh(f: TrainingRefreshFrequency): string {
  if (f === 'annually') return 'on an annual basis'
  if (f === 'biannually') return 'on a biannual basis'
  return 'as needed or following significant system changes'
}

/** Returns type-specific maintenance task sentences for the sustainment paragraph. */
function typeSpecificMaintenanceSentences(type: ProjectType): string {
  switch (type) {
    case 'lighting':
      return (
        'Maintenance activities will include periodic inspection of all light fixtures for proper ' +
        'operation, verification of photocell and timer functionality to ensure accurate activation ' +
        'scheduling, and prompt replacement of bulbs or LED drivers as needed. Physical inspection ' +
        'of any bollards, barriers, or other perimeter protection elements will be conducted to ' +
        'verify continued structural integrity and visibility.'
      )
    case 'cctv':
      return (
        'Maintenance activities will include regular verification of camera angles and coverage ' +
        'areas to confirm no obstructions have developed, review of network video recorder (NVR) ' +
        'storage capacity and retention policy compliance, application of firmware and software ' +
        'updates as released by the manufacturer, and periodic audits of system user access ' +
        'credentials to remove former employees and confirm appropriate authorization levels.'
      )
    case 'access_control':
      return (
        'Maintenance activities will include periodic audits of access credentials to deactivate ' +
        'former employees and update authorization levels, inspection and functional testing of ' +
        'door hardware including closers, latches, and electric strikes, operational testing of ' +
        'intercom systems and entry communication equipment, and verification of any panic button ' +
        'or duress alarm functionality where installed.'
      )
    default:
      return (
        'Maintenance activities will include routine inspection of all installed components to ' +
        'verify continued operational readiness and address any wear or damage promptly.'
      )
  }
}

/** Generate a formal timeline paragraph from structured data. */
export function generateTimelineNarrative(td: TimelineData): string {
  const parts: string[] = []

  // Procurement
  parts.push(
    `Upon award and completion of required approvals, the organization will initiate procurement ` +
      `and vendor solicitation within approximately ${td.procurementStartDaysAfterAward} days of ` +
      `award notification. Procurement and quote finalization is expected to be completed within ` +
      `an additional ${td.procurementDurationDays} days.`,
  )

  // Contractor selection
  if (td.contractorSelectionRequired) {
    parts.push(
      `Contractor selection and formal vendor contracting will be completed prior to commencement ` +
        `of installation work.`,
    )
  }

  // Permitting
  if (td.permittingRequired) {
    parts.push(
      `All required permits — including applicable electrical, building, or local authority ` +
        `approvals — will be secured before installation begins.`,
    )
  }

  // Installation
  parts.push(
    `Installation and implementation work is expected to be completed within approximately ` +
      `${td.installationDurationDays} days.`,
  )

  // Testing
  parts.push(
    `Following installation, ${td.testingDurationDays} days of testing and commissioning will ` +
      `verify proper system operation and confirm all components meet performance specifications.`,
  )

  // Training
  if (td.trainingRequired) {
    parts.push(
      `Staff training, estimated at ${td.trainingDurationDays} days, will follow installation ` +
        `to ensure that all authorized personnel are proficient in the operation and maintenance ` +
        `of the newly installed system.`,
    )
  }

  // Closeout
  parts.push(
    `Final project documentation and grant closeout activities, estimated at ` +
      `${td.finalDocumentationDays} days, will be completed in accordance with FEMA grant ` +
      `compliance requirements.`,
  )

  // Responsible party
  parts.push(
    `Overall project management and coordination responsibility will reside with ` +
      `${td.responsibleParty}.`,
  )

  return parts.join(' ')
}

/** Generate a formal sustainment paragraph from structured data + project type. */
export function generateSustainmentNarrative(sd: SustainmentData, type: ProjectType): string {
  const parts: string[] = []

  // Opening commitment
  parts.push(
    `The organization is committed to sustaining this investment through routine maintenance, ` +
      `periodic inspection, and administrative oversight beyond the period of performance.`,
  )

  // Ownership
  parts.push(
    `Responsibility for ongoing system operation and maintenance will reside with ` +
      `${sd.maintenanceOwner}.`,
  )

  // Type-specific maintenance tasks
  parts.push(typeSpecificMaintenanceSentences(type))

  // Inspection cadence
  parts.push(
    `All installed systems and components will be inspected on a ` +
      `${formatFrequency(sd.inspectionFrequency)} basis to ensure continued operational readiness ` +
      `and system integrity.`,
  )

  // Vendor/warranty
  if (sd.vendorSupport && sd.warrantyTermYears > 0) {
    parts.push(
      `Vendor support and warranty coverage — valid for ${sd.warrantyTermYears} year${sd.warrantyTermYears !== 1 ? 's' : ''} ` +
        `following installation — will be utilized for technical assistance, component ` +
        `replacements, and repairs as applicable.`,
    )
  } else if (sd.vendorSupport) {
    parts.push(
      `Vendor support will be utilized for technical assistance and repairs as applicable.`,
    )
  }

  // Budget ownership
  parts.push(
    `Post-award maintenance costs, including routine supplies and replacement components, will be ` +
      `incorporated into the organization's operating budget under the oversight of ` +
      `${sd.budgetOwner}.`,
  )

  // Training refresh
  parts.push(
    `Staff training on system operation and emergency procedures will be refreshed ` +
      `${formatTrainingRefresh(sd.trainingRefreshFrequency)}.`,
  )

  // Recordkeeping
  if (sd.recordkeepingRequired) {
    parts.push(
      `All maintenance, inspection, and testing records will be retained in accordance with FEMA ` +
        `grant documentation requirements.`,
    )
  }

  return parts.join(' ')
}

// ─── Vague text detector ──────────────────────────────────────────────────────

const VAGUE_PATTERNS: RegExp[] = [
  /\btbd\b/i,
  /\bto be determined\b/i,
  /\bto be confirmed\b/i,
  /\bn\/a\b/i,
  /\bas needed\b.*\bvague\b/i, // only flag "as needed" if it's clearly a placeholder
  /\bsome point\b/i,
  /\bvarious\b.{0,15}\bactivities\b/i,
  /\betc\.\b/i,
  /\bwill be done\b/i,
  /\bwill happen\b/i,
  /\bwill occur\b/i,
  /\bcontact vendor\b/i,
  /\bsee attached\b/i,
  /\bfill in\b/i,
  /^\s*$/,
]

export function detectVagueText(text: string): string[] {
  const warnings: string[] = []
  for (const re of VAGUE_PATTERNS) {
    if (re.test(text)) {
      warnings.push(`Narrative contains potentially vague language — review before submission`)
      break // one warning per section is enough
    }
  }
  return warnings
}

// ─── Generation warnings ──────────────────────────────────────────────────────

function buildGenerationWarnings(
  project: ProjectNarrativeInput,
  type: ProjectType,
): string[] {
  const warnings: string[] = []

  // No vendor names in budget items
  const hasVendor = project.budgetItems.some((b) => b.vendorName && b.vendorName.trim())
  if (!hasVendor) {
    warnings.push(
      'No vendor names found in budget items — add vendor information to strengthen timeline ' +
        'and sustainment specificity',
    )
  }

  // Fell through to 'general' with no match
  if (type === 'general') {
    warnings.push(
      'Project type could not be determined from title, category, or budget items — ' +
        'review generated narrative to confirm it reflects the actual scope',
    )
  }

  return warnings
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Resolves the timeline and sustainment narrative for a project.
 *
 * Priority:
 *  1. User-authored override (timelineNarrative / sustainmentNarrative)
 *  2. Structured data (timelineData / sustainmentData) → generate paragraph
 *  3. Inferred defaults from project type detection → generate paragraph
 */
export function generateProjectNarrativeDefaults(
  project: ProjectNarrativeInput,
): ProjectNarrativeResult {
  const projectType = detectProjectType(project)
  const generationWarnings: string[] = []
  let timelineSource: NarrativeSource
  let sustainmentSource: NarrativeSource

  // ── Timeline ──────────────────────────────────────────────────────────────
  let timelineNarrative: string

  if (project.timelineNarrative && project.timelineNarrative.trim()) {
    timelineNarrative = project.timelineNarrative.trim()
    timelineSource = 'user'
    generationWarnings.push(...detectVagueText(timelineNarrative))
  } else if (project.timelineData) {
    timelineNarrative = generateTimelineNarrative(project.timelineData)
    timelineSource = 'structured'
  } else {
    const defaults = defaultTimeline(projectType)
    timelineNarrative = generateTimelineNarrative(defaults)
    timelineSource = 'inferred'
    generationWarnings.push(...buildGenerationWarnings(project, projectType))
  }

  // ── Sustainment ───────────────────────────────────────────────────────────
  let sustainmentNarrative: string

  if (project.sustainmentNarrative && project.sustainmentNarrative.trim()) {
    sustainmentNarrative = project.sustainmentNarrative.trim()
    sustainmentSource = 'user'
    generationWarnings.push(...detectVagueText(sustainmentNarrative))
  } else if (project.sustainmentData) {
    sustainmentNarrative = generateSustainmentNarrative(project.sustainmentData, projectType)
    sustainmentSource = 'structured'
  } else {
    const defaults = defaultSustainment(projectType)
    sustainmentNarrative = generateSustainmentNarrative(defaults, projectType)
    sustainmentSource = 'inferred'
    // Warnings already added by timeline pass above; avoid duplicates
  }

  const isGenerated =
    timelineSource !== 'user' || sustainmentSource !== 'user'

  // Deduplicate warnings
  const uniqueWarnings = [...new Set(generationWarnings)]

  return {
    timelineNarrative,
    sustainmentNarrative,
    projectType,
    timelineSource,
    sustainmentSource,
    isGenerated,
    generationWarnings: uniqueWarnings,
  }
}
