/**
 * project-narrative-engine.ts
 *
 * Generates formal, FEMA-appropriate narrative paragraphs for:
 *   - Implementation Plan
 *   - Estimated Timeline / Milestones
 *   - Sustainment / Maintenance Plan
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
  proposedSolution?: string | null
  implementationNotes?: string | null       // user-authored override for implementation plan
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
  implementationNarrative: string
  implementationSource: NarrativeSource
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

// ─── Budget item feature detection ───────────────────────────────────────────

function hasItemMatching(items: ProjectNarrativeInput['budgetItems'], re: RegExp): boolean {
  return items.some((b) => re.test(b.itemName))
}

function vendorList(items: ProjectNarrativeInput['budgetItems']): string {
  const names = [...new Set(items.map((b) => b.vendorName?.trim()).filter(Boolean))] as string[]
  if (names.length === 0) return 'qualified contractors'
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1]
}

// ─── Implementation plan generator ───────────────────────────────────────────

/** Generate a formal implementation plan narrative from project data. */
export function generateImplementationPlan(project: ProjectNarrativeInput, type: ProjectType): string {
  const vendors = vendorList(project.budgetItems)
  const hasBollards = hasItemMatching(project.budgetItems, /bollard|vehicle.{0,10}barrier|crash.{0,10}rated/i)
  const hasPhotocell = hasItemMatching(project.budgetItems, /photocell|dusk.{0,10}dawn|timer|sensor/i)
  const hasPanicButton = hasItemMatching(project.budgetItems, /panic.{0,10}button|duress/i)
  const hasIntercom = hasItemMatching(project.budgetItems, /intercom|video.{0,10}entry|call.{0,10}panel|entry.{0,10}panel/i)
  const hasMagLock = hasItemMatching(project.budgetItems, /mag.?lock|electric.{0,10}strike|door.{0,10}closer/i)

  switch (type) {
    case 'lighting': {
      const parts: string[] = []
      parts.push(
        `Following award of grant funds, the organization will initiate the procurement process ` +
        `for the specified lighting and perimeter security equipment, coordinating with ` +
        `${vendors} for delivery of fixtures, mounting hardware, and associated electrical ` +
        `components as itemized in the project budget.`,
      )
      parts.push(
        `All applicable building, electrical, and local authority permits required for exterior ` +
        `lighting installation will be secured prior to commencement of any installation work.`,
      )
      parts.push(
        `Installation will include site preparation, conduit and wiring runs as needed, fixture ` +
        `mounting, and connection to existing electrical service. All work will be performed by ` +
        `a licensed electrical contractor in accordance with local building codes and manufacturer ` +
        `specifications.`,
      )
      if (hasPhotocell) {
        parts.push(
          `Photocells, timers, and lighting control systems will be programmed and calibrated to ` +
          `ensure accurate dusk-to-dawn or scheduled activation appropriate for the facility's ` +
          `operating hours and security requirements.`,
        )
      }
      if (hasBollards) {
        parts.push(
          `Physical perimeter protection elements including vehicle bollards and barriers will ` +
          `be installed and inspected to confirm structural integrity, proper anchoring, and ` +
          `compliance with placement specifications.`,
        )
      }
      parts.push(
        `Upon completion of installation, a comprehensive operational test will be conducted to ` +
        `verify proper illumination coverage across all targeted areas, confirm that no dark ` +
        `zones remain at identified vulnerability points, and ensure all fixtures operate ` +
        `correctly within the control system.`,
      )
      parts.push(
        `Facility staff responsible for security operations will receive orientation on system ` +
        `controls, timer and photocell adjustment procedures, and maintenance reporting protocols.`,
      )
      parts.push(
        `All project documentation, including installation records, as-built drawings, equipment ` +
        `warranties, and vendor invoices, will be retained in the organization's grant ` +
        `compliance file in accordance with FEMA record retention requirements.`,
      )
      return parts.join(' ')
    }

    case 'cctv': {
      const parts: string[] = []
      parts.push(
        `Following award of grant funds, the organization will coordinate with ` +
        `${vendors} for procurement and delivery of the video surveillance equipment ` +
        `specified in the project budget, including IP cameras, network video recorder (NVR), ` +
        `cabling, power-over-Ethernet (PoE) infrastructure, and associated hardware.`,
      )
      parts.push(
        `Cable routing, conduit installation, and network infrastructure work will be completed ` +
        `prior to camera and NVR mounting to minimize disruption to facility operations. All ` +
        `cabling will be routed through conduit or within walls and ceilings in accordance with ` +
        `applicable codes.`,
      )
      parts.push(
        `Cameras will be positioned and angled to maximize coverage of identified vulnerability ` +
        `zones, including primary entry and exit points, parking areas, exterior perimeter ` +
        `locations, and high-traffic interior corridors as specified in the project scope.`,
      )
      parts.push(
        `The NVR will be configured with appropriate storage capacity, a video retention schedule ` +
        `consistent with organizational policy and grant compliance requirements, and secure ` +
        `user access controls including unique login credentials for authorized personnel.`,
      )
      parts.push(
        `Upon completion of installation, a full recording and playback test will be performed ` +
        `to confirm that all camera feeds are operational, that coverage areas align with the ` +
        `project specifications, and that remote access and alert functions operate as intended.`,
      )
      parts.push(
        `Authorized staff will receive training on system operation, live monitoring procedures, ` +
        `video retrieval and clip export, and user account administration including credential ` +
        `management for authorized personnel.`,
      )
      parts.push(
        `All project documentation, including as-built camera placement diagrams, system ` +
        `configuration records, equipment warranties, and vendor invoices, will be retained ` +
        `in the organization's grant compliance file in accordance with FEMA requirements.`,
      )
      return parts.join(' ')
    }

    case 'access_control': {
      const parts: string[] = []
      parts.push(
        `Following award of grant funds, the organization will coordinate with ` +
        `${vendors} for procurement and delivery of the access control equipment specified ` +
        `in the project budget, including card readers, door controllers, and associated ` +
        `hardware and cabling components.`,
      )
      parts.push(
        `Prior to installation, door frames, hardware mounting points, and electrical rough-in ` +
        `will be assessed and prepared to accommodate the new access control components without ` +
        `compromising existing fire egress or building code compliance.`,
      )
      parts.push(
        `Card readers and door controllers will be installed at designated entry points. ` +
        (hasMagLock
          ? `Electric strikes, magnetic locks, or electrified door closers will be installed ` +
            `and integrated with the controller to provide credential-based access management. `
          : `Credential-based access management will be configured for each controlled entry point. `),
      )
      if (hasIntercom) {
        parts.push(
          `Video intercom or entry communication panels will be installed and integrated with ` +
          `the access control system to enable authorized personnel to remotely screen and ` +
          `admit visitors before granting entry.`,
        )
      }
      parts.push(
        `The credential database will be configured with initial access cards or key fobs ` +
        `issued to authorized staff. Access permission levels will be assigned in accordance ` +
        `with organizational security policy, and a credential issuance log will be established ` +
        `to support ongoing administration.`,
      )
      if (hasPanicButton) {
        parts.push(
          `Panic buttons and duress alarm devices will be installed at designated locations and ` +
          `tested to confirm reliable signal transmission to the monitoring station or emergency ` +
          `response point. Staff will be briefed on activation procedures and response protocols.`,
        )
      }
      parts.push(
        `A full system test will be conducted upon completion, including verification of access ` +
        `grant and denial functions at each reader, failsafe and fail-secure door behavior under ` +
        `loss of power, and confirmation that all alarm and alert integrations are operational.`,
      )
      parts.push(
        `Authorized staff will receive training on credential administration, access level ` +
        `management, visitor entry procedures, and emergency lockdown and override protocols.`,
      )
      parts.push(
        `All project documentation, including as-built wiring diagrams, credential issuance ` +
        `records, equipment warranties, and vendor invoices, will be retained in the ` +
        `organization's grant compliance file in accordance with FEMA requirements.`,
      )
      return parts.join(' ')
    }

    default: {
      const parts: string[] = []
      parts.push(
        `Following award of grant funds, the organization will initiate the procurement process ` +
        `for the specified security equipment, coordinating with ${vendors} for delivery of ` +
        `components as itemized in the project budget.`,
      )
      parts.push(
        `All necessary site preparation and pre-installation assessments will be completed prior ` +
        `to commencement of installation activities. Equipment will be installed by qualified ` +
        `contractors in accordance with manufacturer specifications and applicable local codes.`,
      )
      parts.push(
        `Upon completion of installation, a comprehensive operational test will be conducted to ` +
        `verify that all installed components function correctly and that project objectives ` +
        `have been fully achieved.`,
      )
      parts.push(
        `Authorized staff will receive training and orientation on the operation and routine ` +
        `maintenance of the installed system to ensure effective use and long-term functionality.`,
      )
      parts.push(
        `All project documentation, including installation records, equipment warranties, and ` +
        `vendor invoices, will be retained in the organization's grant compliance file in ` +
        `accordance with FEMA record retention requirements.`,
      )
      return parts.join(' ')
    }
  }
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
  /\bwill be done\b/i,
  /\bwill happen\b/i,
  /\bwill occur\b/i,
  /\bcontact vendor\b/i,
  /\bsee attached\b/i,
  /\bfill in\b/i,
  // Note: empty strings are NOT vague — they are "missing". Caller must check non-empty first.
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
 * Resolves the implementation, timeline, and sustainment narrative for a project.
 *
 * Priority for each section:
 *  1. User-authored override (implementationNotes / timelineNarrative / sustainmentNarrative)
 *  2. Structured data (timelineData / sustainmentData) → generate paragraph
 *  3. Inferred defaults from project type detection → generate paragraph
 */
export function generateProjectNarrativeDefaults(
  project: ProjectNarrativeInput,
): ProjectNarrativeResult {
  const projectType = detectProjectType(project)
  const generationWarnings: string[] = []
  let implementationSource: NarrativeSource
  let timelineSource: NarrativeSource
  let sustainmentSource: NarrativeSource

  // ── Implementation Plan ───────────────────────────────────────────────────
  let implementationNarrative: string

  if (project.implementationNotes && project.implementationNotes.trim()) {
    implementationNarrative = project.implementationNotes.trim()
    implementationSource = 'user'
    generationWarnings.push(...detectVagueText(implementationNarrative))
  } else {
    implementationNarrative = generateImplementationPlan(project, projectType)
    implementationSource = 'inferred'
    // Generation warnings added below after type detection
  }

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
    // Warnings already added by timeline/implementation pass above; avoid duplicates
  }

  const isGenerated =
    implementationSource !== 'user' ||
    timelineSource !== 'user' ||
    sustainmentSource !== 'user'

  // Deduplicate warnings
  const uniqueWarnings = [...new Set(generationWarnings)]

  return {
    implementationNarrative,
    implementationSource,
    timelineNarrative,
    sustainmentNarrative,
    projectType,
    timelineSource,
    sustainmentSource,
    isGenerated,
    generationWarnings: uniqueWarnings,
  }
}
