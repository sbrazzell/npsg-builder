/**
 * seed-cpted-assessment.ts
 *
 * Seeds data from the Rock Hill Police Department CPTED Site Survey
 * completed April 24, 2026 by MPOII JC Whiteside for Park Baptist Church,
 * 717 E Main Street, Rock Hill, SC 29730.
 *
 * Creates:
 *  - Site.lawEnforcementFindings updates for all 3 PBC sites
 *  - SiteObservation records (exterior/interior vulnerabilities)
 *  - ExistingSecurityMeasure records (CPTED-verified positive points)
 *  - ThreatAssessment records (structurally-confirmed risk categories)
 *
 * Run:
 *   node --env-file=.env -e "
 *   require('ts-node').register({
 *     transpileOnly: true,
 *     compilerOptions: { module: 'CommonJS', moduleResolution: 'node', target: 'ES2020' }
 *   });
 *   require('./prisma/seed-cpted-assessment.ts');
 *   "
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter })

const MAIN   = 'cmo45z961000004jrhmd7p6su'  // Main Building (717 E Main St)
const CAB    = 'cmo45zwat000004jxj0aq1c6o'  // Christian Activities Building
const GARAGE = 'cmo463xbi000004jj788dhe85'  // White Street Lot / Garage

const CPTED_SOURCE        = 'law_enforcement'
const CPTED_AGENCY        = 'Rock Hill Police Department'
const CPTED_DATE_NOTE     = 'RHPD CPTED Survey — April 24, 2026 (MPOII JC Whiteside)'

async function main() {
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  Seeding RHPD CPTED Assessment — Park Baptist Church')
  console.log('═══════════════════════════════════════════════════════\n')

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Update Site.lawEnforcementFindings
  // ─────────────────────────────────────────────────────────────────────────

  await prisma.site.update({
    where: { id: MAIN },
    data: {
      lawEnforcementFindings: [
        'RHPD CPTED Site Survey completed April 24, 2026 by MPOII JC Whiteside.',
        '',
        'EXTERIOR DEFICIENCIES: No alarm system installed; not all exterior doors alarmed. Main entry is glass/metal frame with reinforced push bar but only one lock device. Rear door is solid but unlit, single lock only, no reinforced frame, no alarm system. Three window-mounted AC units present — dowel rods required on all three to prevent forced entry. No motion-detection lighting on perimeter. Lot lighting uses non-LED (deficient) except parking lot. Some fencing gates lack locks; rear playground gate lock specifically needs repair. Hedges taller than 4 feet present but not near windows or doors. Sight-line obstructions: rear tree (near rose bushes) needs canopy raised/trimmed one foot from fence; magnolias in front of church need trimming.',
        '',
        'ENTRAPMENT ZONES: Left side entrance and alley under stairs to sanctuary identified as concealment points. RHPD recommends convex mirrors at staircase approach. Tunnel below front stairs connects to public sidewalk. Half walls in parking area can enable loitering, sleeping, and hiding — skate stops recommended.',
        '',
        'INTERIOR DEFICIENCIES: Multiple windows painted shut — poses life-safety egress risk during fire or active shooter event. Interior doors lack locks or latches on every room; scissor hinges absent on multiple interior doors. Several interior doors are hollow-core and can be breached by pushing. Doors need locks/latches or solid rubber door stops accessible from the secured side.',
        '',
        'POSITIVE POINTS CONFIRMED: Camera system rated excellent with good coverage and on-site storage. Armed safety team with structured placement during services. Single monitored entry point enforced during services. Cameras actively monitored during all services. LED-60 lot lighting provides adequate parking coverage.',
        '',
        'History of area: Former homeless encampment at rear of property prior to wood line clearing.',
      ].join('\n'),
    },
  })
  console.log('✅ Updated lawEnforcementFindings — Main Building')

  await prisma.site.update({
    where: { id: CAB },
    data: {
      lawEnforcementFindings: [
        'RHPD CPTED Site Survey completed April 24, 2026 — Christian Activities Building (CAB).',
        '',
        'PARKING / ACTIVITY GENERATORS: Parking lot shared between Main Building and CAB is open and LED-60 lit with adequate coverage. The open layout between two buildings creates activity generator and potential surveillance blind spots. Half walls between buildings can enable loitering and concealment — skate stops recommended as deterrent.',
      ].join('\n'),
    },
  })
  console.log('✅ Updated lawEnforcementFindings — CAB')

  await prisma.site.update({
    where: { id: GARAGE },
    data: {
      lawEnforcementFindings: [
        'RHPD CPTED Site Survey completed April 24, 2026 — White Street Lot / Garage.',
        '',
        'LIGHTING DEFICIENCY: Rear (White Street-facing) side of garage has no lighting. RHPD recommends lighting installation on this side to reduce vandalism risk and eliminate a concealment opportunity at night.',
      ].join('\n'),
    },
  })
  console.log('✅ Updated lawEnforcementFindings — White Street Lot/Garage\n')

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SiteObservation records — CPTED findings
  // ─────────────────────────────────────────────────────────────────────────

  const observations = await prisma.siteObservation.createMany({
    data: [
      // ── Main Building — Security System Gaps ──────────────────────────────
      {
        siteId:              MAIN,
        title:               'CPTED: No Alarm System Installed — Doors Unmonitored',
        locationDescription: 'Building-wide; all entry/exit doors',
        observationType:     'security_gap',
        severity:            5,
        notes:               `${CPTED_DATE_NOTE}. Alarm system is NOT installed. Not all doors are alarmed. Main door and rear door both lack alarm system connections. Motion cameras are present but no integrated intrusion detection or monitoring alert system exists. This is a critical gap — any after-hours forced entry would go undetected. Immediate priority for NSGP grant.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: Rear Door — Unlit, Single Lock, No Reinforced Frame',
        locationDescription: 'Rear exit/entry door, Main Building',
        observationType:     'security_gap',
        severity:            4,
        notes:               `${CPTED_DATE_NOTE}. Rear door is solid (positive) but has no lighting, only one locking device, no reinforced frame for lock, and no alarm system connection. Obstructions/entrapment zones near the door are absent (positive). Combined deficiencies make the rear door the most vulnerable entry point. Requires: exterior light, secondary lock or deadbolt, reinforced frame, and alarm sensor.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: 3 Window-Mount AC Units — No Dowel Rods (Forced Entry Risk)',
        locationDescription: 'Window-mounted AC units, Main Building',
        observationType:     'security_gap',
        severity:            3,
        notes:               `${CPTED_DATE_NOTE}. Three window-mounted air conditioning units are present. RHPD specifically flagged that dowel rods are required on the interior of each window to prevent AC units from being pushed in and used as an unauthorized entry point. Low-cost fix with high-impact security improvement.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: Main Door — Single Lock Only (No Secondary Device)',
        locationDescription: 'Main entry door, front of Main Building',
        observationType:     'security_gap',
        severity:            3,
        notes:               `${CPTED_DATE_NOTE}. Main entry door is glass with metal frame and reinforced push bar — but has only one locking device. CPTED standards recommend more than one lock device on main entries. Secondary lock (deadbolt or security bar) needed to meet hardening standard.`,
      },

      // ── Main Building — Interior Vulnerabilities ───────────────────────────
      {
        siteId:              MAIN,
        title:               'CPTED: Windows Painted Shut — Fire & Active Shooter Egress Hazard',
        locationDescription: 'Multiple interior rooms, Main Building',
        observationType:     'structural',
        severity:            5,
        notes:               `${CPTED_DATE_NOTE}. RHPD identified multiple windows that are painted shut throughout the building. This is a life-safety deficiency: windows cannot be used for egress during a fire or to exit a room during an active shooter lockdown. Correction requires either opening painted windows and installing functional locks, or replacing windows. This is also an NFPA/fire code compliance concern.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: Interior Doors — Hollow-Core, Missing Locks & Scissor Hinges',
        locationDescription: 'Multiple interior rooms, Main Building',
        observationType:     'structural',
        severity:            4,
        notes:               `${CPTED_DATE_NOTE}. Multiple interior deficiencies identified: (1) Several doors are hollow-core and can be breached by pushing. (2) Multiple interior doors lack locks or latches entirely. (3) Some interior doors without locks also lack scissor hinges as a compensating control. RHPD recommends: locks/latches on every door OR solid rubber door stops accessible from the secured side of the door. Critical for active shooter lockdown capability.`,
      },

      // ── Main Building — Exterior Environmental ────────────────────────────
      {
        siteId:              MAIN,
        title:               'CPTED: Entrapment Zone — Left Side Entrance & Under Staircase',
        locationDescription: 'Left side entrance and alley under sanctuary staircase, Main Building',
        observationType:     'environmental',
        severity:            4,
        notes:               `${CPTED_DATE_NOTE}. RHPD identified two entrapment/concealment zones: (1) Left side entrance to the church provides an easy hiding spot for someone waiting to ambush congregants. (2) Alley under the stairs leading to the sanctuary is a good hiding spot for approaching threats. RHPD specifically recommends installation of convex mirrors at the staircase approach to enable security team to see threats before entering the alley. Address through mirror installation and/or camera coverage expansion.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: Inadequate Lighting — Non-Parking Side & Rear of Church',
        locationDescription: 'Right/non-parking side and rear exterior of Main Building',
        observationType:     'environmental',
        severity:            4,
        notes:               `${CPTED_DATE_NOTE}. No exterior lighting on the side of the church that does not face the parking lot, and no lighting on the rear of the building. RHPD recommends installation of six (6) higher-mounted exterior lights to prevent vandalism and eliminate concealment opportunities. Surveyor noted solar-charged motion lights as a lower-cost interim fix. This gap creates unmonitored dark areas adjacent to the building after sunset.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: No Motion-Detector Lot Lighting',
        locationDescription: 'Exterior perimeter, Main Building and parking lot',
        observationType:     'environmental',
        severity:            3,
        notes:               `${CPTED_DATE_NOTE}. No motion-detecting lights are installed anywhere on the property. Existing LED-60 parking lot lighting is static. Motion-activated lighting would serve as a deterrent, alert security personnel to movement, and reduce false negatives on camera coverage after hours. Recommend as part of lighting upgrade project.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: Rear Playground Gate Lock Missing/Broken',
        locationDescription: 'Rear playground gate, Main Building perimeter',
        observationType:     'security_gap',
        severity:            3,
        notes:               `${CPTED_DATE_NOTE}. RHPD inspection found that some fencing gates on the property do not have locks. Specifically called out: rear playground gate needs a functional lock. Consistent with prior safety team reports of unauthorized after-hours playground use. All gates should have working keyed or combination locks installed.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: Sight-Line Obstruction — Rear Tree & Front Magnolias',
        locationDescription: 'Rear of property (near rose bushes) and front of Main Building',
        observationType:     'environmental',
        severity:            2,
        notes:               `${CPTED_DATE_NOTE}. Two sight-line obstructions identified: (1) Rear tree near rose bushes — canopy needs to be raised and tree trimmed to within one foot of fence to remove concealment cover. (2) Magnolias in front of church need to be trimmed/raised to restore clear sight lines from the road to building frontage. Both items are low-cost maintenance actions with meaningful CPTED benefit.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: Tunnel Below Front Stairs — Concealment & Access Risk',
        locationDescription: 'Tunnel under front staircase, Main Building',
        observationType:     'environmental',
        severity:            3,
        notes:               `${CPTED_DATE_NOTE}. Tunnel below the front entrance stairs connects via sidewalk to the public sidewalk network. Identified as a movement predictor — provides concealed approach path to the building. Area is partially lit but requires camera coverage and possibly physical hardening (grate, barrier) to prevent unauthorized habitation or approach concealment.`,
      },
      {
        siteId:              MAIN,
        title:               'CPTED: Half Walls Enable Loitering, Sleeping & Concealment',
        locationDescription: 'Parking lot area between Main Building and CAB',
        observationType:     'environmental',
        severity:            2,
        notes:               `${CPTED_DATE_NOTE}. Parking lot between buildings has no benches, but adequate half walls that allow seating, sleeping, and hiding. RHPD recommends installation of skate stops (metal deterrent strips) on top of half walls to prevent their use as resting surfaces. Low-cost deterrent aligned with CPTED territorial reinforcement principles.`,
      },

      // ── White Street Lot / Garage ─────────────────────────────────────────
      {
        siteId:              GARAGE,
        title:               'CPTED: No Lighting on Garage Rear — White Street Side',
        locationDescription: 'Rear (White Street-facing) exterior wall, White Street Lot/Garage',
        observationType:     'environmental',
        severity:            4,
        notes:               `${CPTED_DATE_NOTE}. RHPD specifically noted that lighting is needed on the rear side of the garage facing White Street. Current absence of lighting creates a dark, unmonitored zone along a public street, enabling vandalism and concealment. Consistent with prior team reports of the garage area being used by transients after hours. Lighting installation is a priority recommendation.`,
      },
    ],
  })
  console.log(`✅ Created ${observations.count} SiteObservation records`)

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ExistingSecurityMeasure records — CPTED-verified positive points
  // ─────────────────────────────────────────────────────────────────────────

  const measures = await prisma.existingSecurityMeasure.createMany({
    data: [
      {
        siteId:              MAIN,
        category:            'surveillance',
        description:         'Camera System — CPTED Verified: Good Coverage, Locations & On-Site Storage',
        effectivenessRating: 4,
        gapsRemaining:       'No alarm system integration; some blind spots (left side entrance, under staircase, rear/side of building without lighting). Garage White Street side uncovered.',
        notes:               `${CPTED_DATE_NOTE}. RHPD specifically cited: "Good camera system with good locations and storage." Cameras are actively monitored during services. This is a verified strength and forms the foundation for future camera expansion to cover identified blind spots.`,
      },
      {
        siteId:              MAIN,
        category:            'personnel',
        description:         'Armed Safety Team — CPTED Verified: Structured Placement & Service Protocol',
        effectivenessRating: 4,
        gapsRemaining:       'No formal active shooter training documented; protocols informal/undocumented. No liaison protocol with RHPD for active incidents.',
        notes:               `${CPTED_DATE_NOTE}. RHPD cited: "Good planning for sanctuary service protection with armed safety team and placement of where to sit/stand during services." This represents a verified operational security strength. Active shooter training (in planning as of April 2026) will further strengthen this measure.`,
      },
      {
        siteId:              MAIN,
        category:            'access_control',
        description:         'Single Monitored Entry Point Protocol During Services — CPTED Verified',
        effectivenessRating: 4,
        gapsRemaining:       'Rear door and side doors are not alarmed; rely on volunteer monitoring. No alarm integration means protocol enforcement is entirely manual.',
        notes:               `${CPTED_DATE_NOTE}. RHPD cited: "Good planning on securing doors during Church services and only allowing one entry point that is monitored." Single-entry protocol is a recognized best practice for house of worship security. Gap is that all other doors lack alarm sensors to detect if they are breached during service.`,
      },
      {
        siteId:              MAIN,
        category:            'surveillance',
        description:         'LED Parking Lot Lighting (LED-60) — CPTED Verified Adequate Coverage',
        effectivenessRating: 3,
        gapsRemaining:       'Coverage limited to parking lot only. No lighting on non-parking side of building, rear of building, or garage White Street side. No motion detection.',
        notes:               `${CPTED_DATE_NOTE}. RHPD noted parking lot is "LED-60 lit with adequate coverage." This is a verified existing strength. However, the survey identified significant lighting deficiencies elsewhere on the campus that this lot-only coverage does not address.`,
      },
    ],
  })
  console.log(`✅ Created ${measures.count} ExistingSecurityMeasure records`)

  // ─────────────────────────────────────────────────────────────────────────
  // 4. ThreatAssessment records — CPTED-confirmed structural risk categories
  // ─────────────────────────────────────────────────────────────────────────

  const threats = await prisma.threatAssessment.createMany({
    data: [
      {
        siteId:             MAIN,
        threatType:         'intrusion',
        description:        'Unauthorized Entry / After-Hours Break-In — CPTED-Confirmed Structural Vulnerabilities',
        likelihood:         4,
        impact:             4,
        source:             CPTED_SOURCE,
        sourceAgency:       CPTED_AGENCY,
        vulnerabilityNotes: 'CPTED survey identified multiple entry vulnerabilities: (1) No alarm system — any after-hours intrusion goes undetected. (2) Rear door: single lock, no reinforced frame, no alarm, no exterior light. (3) Three window-mounted AC units can be pushed in without dowel rod security. (4) Main entry has only one lock device. (5) Hollow interior doors can be breached by force. These compound vulnerabilities significantly elevate intrusion likelihood, consistent with the prior attempted break-in to the pastor\'s office documented in safety team communications.',
        incidentHistory:    'One confirmed attempted break-in to the pastor\'s office (reported in safety team communications, 2025). Ongoing transient activity at rear of property (now cleared). RHPD CPTED conducted April 24, 2026 specifically confirmed structural deficiencies enabling intrusion risk.',
      },
      {
        siteId:             MAIN,
        threatType:         'active_shooter',
        description:        'Active Shooter / Violent Intrusion — Structural Egress & Lockdown Vulnerabilities',
        likelihood:         3,
        impact:             5,
        source:             CPTED_SOURCE,
        sourceAgency:       CPTED_AGENCY,
        vulnerabilityNotes: 'CPTED survey identified critical life-safety deficiencies that would impair response to an active shooter event: (1) Windows painted shut throughout building eliminate window-egress as an escape option. (2) Multiple interior doors lack locks — cannot lock down individual rooms. (3) Doors without locks also lack scissor hinges. (4) Hollow-core interior doors can be breached by force, negating attempted lockdowns. (5) Left side entrance and under-staircase alley are concealment zones from which an attacker could approach with minimal visibility. These vulnerabilities are especially critical given: prior Iran/ISIS Easter attack intelligence (April 2026), documented violent individual "Charles" requiring multiple police interventions, and regional church attack awareness.',
        incidentHistory:    'No active shooter event to date. Risk elevated by: Iran/ISIS Easter 2026 threat intelligence bulletin (April 5, 2026); documented violent recurring individual "Charles" (multiple physical confrontations April 2026, arrested twice); general increase in church-targeted violence nationally per federal bulletins. Active Shooter training being planned as of April 2026.',
      },
      {
        siteId:             MAIN,
        threatType:         'vandalism',
        description:        'Vandalism & Property Crime — Enabled by Lighting Gaps and Concealment Zones',
        likelihood:         4,
        impact:             2,
        source:             CPTED_SOURCE,
        sourceAgency:       CPTED_AGENCY,
        vulnerabilityNotes: 'CPTED survey identified multiple conditions enabling vandalism: (1) No exterior lighting on non-parking side and rear of Main Building creates unmonitored dark zones. (2) No lighting on garage White Street side. (3) Half walls in parking area enable after-hours loitering and concealment. (4) No motion-detection lighting to trigger alert or deter activity. (5) Rear playground gate lock is broken/missing. RHPD recommends 6 higher-mounted exterior lights to deter vandalism.',
        incidentHistory:    'Vehicle vandalism (van egging) documented March 29, 2026. Prior transient activity at rear of property (woods camp area). Unauthorized after-hours playground use documented multiple times in 2025-2026.',
      },
      {
        siteId:             GARAGE,
        threatType:         'vandalism',
        description:        'Vandalism & Unauthorized Access — Garage White Street Side (No Lighting)',
        likelihood:         3,
        impact:             2,
        source:             CPTED_SOURCE,
        sourceAgency:       CPTED_AGENCY,
        vulnerabilityNotes: 'CPTED survey specifically called out absence of lighting on the rear/White Street-facing side of the garage. This creates a dark, unobserved zone along a public street that invites vandalism, graffiti, and loitering after dark. No camera coverage on this elevation was confirmed.',
        incidentHistory:    'Garage area has been used by transients during evening hours per safety team reports. Medical emergency at garage March 15, 2026. RHPD CPTED April 24, 2026 specifically identified lighting deficiency on White Street side.',
      },
    ],
  })
  console.log(`✅ Created ${threats.count} ThreatAssessment records\n`)

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────

  const [totalObs, totalMeasures, totalThreats] = await Promise.all([
    prisma.siteObservation.count(),
    prisma.existingSecurityMeasure.count(),
    prisma.threatAssessment.count(),
  ])

  console.log('═══════════════════════════════════════════════════════')
  console.log('  CPTED Seed Complete')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Site.lawEnforcementFindings: 3 sites updated`)
  console.log(`  SiteObservations (total in DB): ${totalObs}`)
  console.log(`  ExistingSecurityMeasures (total in DB): ${totalMeasures}`)
  console.log(`  ThreatAssessments (total in DB): ${totalThreats}`)
  console.log('═══════════════════════════════════════════════════════\n')
}

main().catch(console.error).finally(() => prisma.$disconnect())
