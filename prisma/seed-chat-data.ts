/**
 * seed-chat-data.ts
 *
 * Seeds ThreatAssessment, SiteObservation, and ExistingSecurityMeasure records
 * derived from the Park Baptist Safety Team WhatsApp chat history (Feb 2025 – Mar 2026).
 *
 * Run:  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-chat-data.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter })

// ─── Site IDs (from production Turso DB) ─────────────────────────────────────
const MAIN   = 'cmo45z961000004jrhmd7p6su'   // Main Building — 717 E. Main St.
const CAB    = 'cmo45zwat000004jxj0aq1c6o'   // Christian Activities Building — 703 E. Main St.
const GARAGE = 'cmo463xbi000004jj788dhe85'   // White Street Lot / Garage — 702 E. White St.

// ─── Helpers ─────────────────────────────────────────────────────────────────
function d(iso: string) { return new Date(iso) }

async function main() {
  console.log('🌱  Seeding chat-derived data...\n')

  // ─── THREAT ASSESSMENTS ──────────────────────────────────────────────────

  const threats = await prisma.threatAssessment.createMany({
    data: [

      // ── MAIN BUILDING ────────────────────────────────────────────────────

      {
        siteId: MAIN,
        threatType: 'Unauthorized Access / Trespassing',
        description:
          'Recurring transient individuals loitering and soliciting on church property. ' +
          'Individual known as "Tarrence" was found soliciting congregants for money in the parking lot (3/12/25). ' +
          'He is known to police, primarily harmless but abuses alcohol and can make members uncomfortable. ' +
          'He was warned to stop soliciting and to seek out a safety team member if he returns during a service. ' +
          'Separate from Tarrence, "Danny" (homeless, sometimes intoxicated) visited the property multiple times ' +
          'in July 2025 including during Sunday School hours. Both were managed without incident but represent ' +
          'an ongoing pattern of transient foot traffic requiring sustained awareness.',
        likelihood: 4,
        impact: 2,
        vulnerabilityNotes:
          'Church property is adjacent to a field with no fencing, providing easy pedestrian access. ' +
          'Proximity to downtown Rock Hill and Pathways shelter increases transient foot traffic.',
        incidentHistory:
          'Tarrence soliciting in parking lot 3/12/25. Danny present during SS hour 7/13/25 (intoxicated). ' +
          'Roger and Brandi (homeless, Brandi banned from Pathways) visited 7/27/25. ' +
          'Charlotte (homeless woman with history of violent tendencies at shelter) attended service 10/5/25 and 10/29/25. ' +
          '"Angel" observed sitting outside by crosses 7/27/25. Unknown man sleeping on breezeway door mat overnight 7/8/25.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Unauthorized Persons in Wooded Area / Camping on Property',
        description:
          'The wooded area at the rear of the church property (near the soccer goals) has repeatedly harbored ' +
          'unknown individuals. On 3/13/25 a child reported a man sitting in the woods during an evening event. ' +
          'A safety team member walked the woods and found no permanent camp at that time. By 8/30/25 a neighbor ' +
          'reported that people were living in the woods again. The wooded area provides dense cover and is ' +
          'invisible from the building\'s camera system. Children had been allowed to play in this area, raising ' +
          'child safety concerns.',
        likelihood: 4,
        impact: 3,
        vulnerabilityNotes:
          'Dense vegetation provides concealment. No cameras cover the wooded area. ' +
          'Property boundary is unmarked and unfenced. Easy access from surrounding streets and the field. ' +
          'A previous incident had 3 individuals camping simultaneously.',
        incidentHistory:
          '3/13/25: Child reported unknown man sitting in woods during evening event. Team member investigated — no camp found. ' +
          'Safety team formally recommended parents restrict children from woods; announcement made 3/19/25. ' +
          '8/30/25: Neighbor informed team that people were living in the woods again. ' +
          'Leader walked woods 8/31/25 and found no active camp but noted heavy overgrowth. ' +
          'Budget request submitted to clear/thin vegetation for 2026. ' +
          'Individual at Jones & White corner identified as picking up trash (not a threat).',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Domestic Violence Spillover / Targeted Threat to Member',
        description:
          'On 5/4/25 a church member (Carla Rosenthal) disclosed to the safety team that her former partner ' +
          '"Gerry" had physically assaulted her (pushed her down) earlier that week and threatened to come to ' +
          'the church during Sunday service to "discredit" her in front of the congregation. A photo of Gerry ' +
          'was shared with the team. Extra vigilance was maintained during that service. Gerry did not appear. ' +
          'This event highlights the risk of domestic violence situations migrating onto church property.',
        likelihood: 2,
        impact: 4,
        vulnerabilityNotes:
          'Church is a predictable gathering location for members, making it a potential target for individuals ' +
          'seeking to confront or intimidate them. No formal domestic violence protocol existed at the time.',
        incidentHistory:
          '5/4/25: Member disclosed threat from former partner. Team placed on alert. ' +
          'Gerry did not appear that Sunday. No further incidents from this individual reported.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Suspicious Nocturnal Activity — Playground and Exterior Doors',
        description:
          'Camera monitoring revealed a couple on the playground property between 4:20–5:19 AM on 5/22/25. ' +
          'The male returned at 9:20 PM that evening to the outdoor children\'s play area. ' +
          'At approximately 4:19 AM on 5/23/25 the same male was observed looking into the basement door. ' +
          'A woman was also observed at 10:59 PM. Camera monitoring has captured an ongoing pattern of ' +
          'individuals accessing the property at night from the adjacent field.',
        likelihood: 3,
        impact: 3,
        vulnerabilityNotes:
          'Church property is open and accessible from an adjacent field with no fencing. ' +
          'Nighttime camera coverage has blind spots. The basement door and side entries were accessible. ' +
          'No "Camera Surveillance" or "No Trespassing" signage was posted at the time.',
        incidentHistory:
          '5/22/25 4:20 AM: Couple observed on playground, stayed approximately 1 hour then left through field. ' +
          '5/22/25 9:20 PM: Male returned to children\'s play area. ' +
          '5/23/25 4:19 AM: Male looking into basement door. Female also observed 10:59 PM. ' +
          'Team discussed adding surveillance signage and trespassing signs (7/10/25 follow-up: chair knocked over, man observed at 2:30 AM). ' +
          '8/30/25: Individual observed using CAB exterior water spigot at night on motion-capture clips.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Belligerent / Harassing Individual — Joshua David Taft',
        description:
          'Joshua David Taft (aka "Repent shirt guy") first appeared at VBS on 7/8/25 with a "REPENT" shirt, ' +
          'no children, and engaged in belligerent theological arguments with volunteers including a church member\'s spouse. ' +
          'He returned to the parking lot on 7/23/25, approached congregants with a vehicle, called the church "evil," ' +
          'and engaged in bullying discourse. He approached children through his vehicle window. ' +
          'On 9/3/25 he returned and was formally told to leave and informed he was being trespassed. ' +
          'On 9/22/25 the safety team confirmed RHPD had officially trespassed him (valid 1 year). ' +
          'By 11/24/25 the York Baptist Association issued a regional alert: Taft had vandalized a church, ' +
          'was detained at Eastview Baptist, and had caused multiple disturbances across York County.',
        likelihood: 3,
        impact: 3,
        vulnerabilityNotes:
          'Open parking lot and garage area accessible without control. ' +
          'Children\'s outdoor play area visible and accessible from parking lot. ' +
          'Taft showed repeated escalation and willingness to return despite warnings.',
        incidentHistory:
          '7/8/25: First appearance at VBS; belligerent with volunteers, eventually asked to leave by JW. ' +
          '7/23/25: Returned to parking lot; approached congregants through vehicle window, including children; ' +
          'called church evil; engaged pastor\'s family member. ' +
          '9/2/25: License plate photo obtained. Eastview Baptist confirmed they had him on no-trespass. ' +
          '9/3/25: Returned to CAB area (~6:27 PM); formally told to leave and verbally trespassed by team. ' +
          '9/22/25: RHPD official trespass notice confirmed. ' +
          '12/10/25: Amber Hinson observed Taft (now in a white Acura SUV — changed vehicles) at Pathways with a shelter resident. ' +
          '11/24/25: YBA regional alert — Taft arrested for vandalizing a church; causing disturbances at multiple York County churches.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Attempted Break-in',
        description:
          'On 7/8/25 a team member discovered that someone had attempted to break into Pastor Whit\'s office ' +
          'by prying or manipulating a window AC vent. The vent was damaged but the intruder did not fully gain access. ' +
          'Nothing was reported stolen. The incident was out of camera view. ' +
          'Separately, a back door to the property was found to have no lock on the knob and no latch for an external padlock, ' +
          'leaving it effectively unsecured.',
        likelihood: 2,
        impact: 4,
        vulnerabilityNotes:
          'Window AC units create a potential entry vulnerability at ground or accessible floor level. ' +
          'An exterior door with no functional lock was identified (Jennifer Shellenberger\'s storage shed). ' +
          'Area behind the building is not covered by cameras.',
        incidentHistory:
          '7/8/25: Attempted break-in to pastor\'s office window. Vent damaged; nothing taken. ' +
          'Police check requested by Nathan Anderson (no report filed since nothing was taken). ' +
          '7/9/25: Deacon approval obtained to add combo padlock to unsecured back door (code 1907). ' +
          '7/10/25: Padlock installed on Jennifer\'s storage shed door.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Registered Sex Offender / Person of Concern Attending Services and Events',
        description:
          'In November 2025 the safety team was informed by church leadership that an individual (identified as ' +
          '"James Carter") with an arrest record for sexual exploitation of minors had been visiting the church ' +
          'multiple times over the preceding weeks, including college-age events. ' +
          'The charges were still pending in court at the time. Carter did not appear on the SC sex offender registry. ' +
          'The elders implemented an immediate policy: Carter was not allowed to attend any service or event until ' +
          'he had met with the elders and agreed to a formal attendance protocol including an Accountability Accompaniment Person (AAP). ' +
          'A church-wide Registered Sex Offender Policy was drafted, reviewed, and put on a path to congregational vote.',
        likelihood: 3,
        impact: 5,
        vulnerabilityNotes:
          'Church hosts multiple events including youth and college gatherings where minors may be present. ' +
          'Prior to this incident, no formal RSO screening or attendance policy existed. ' +
          '109 registered sex offenders live within 3 miles of the church property.',
        incidentHistory:
          '11/19/25: Safety team informed of James Carter\'s background and visits. ' +
          'Person-of-interest tag added to camera system. ' +
          'Determination: not currently on SC sex offender registry but arrested for exploitation of minors. ' +
          '11/19/25 7:17 PM: Carter arrived; met with elders (Grant and Simeon); informed he could not return without meeting conditions; ' +
          'he was reportedly receptive. ' +
          '11/21/25: RSO Policy document circulated to safety team and leadership for review. ' +
          'Policy proceeding to congregation vote.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Threat to Church Member by Third Party (Shelter Resident)',
        description:
          'On 11/22/25 a church member who works at a women\'s shelter notified the safety team that a shelter ' +
          'resident (Aytia "Tia" Tarpley) had become very angry with her, discovered she attended Park Baptist Church, ' +
          'and sent communications that constituted a threat. The shelter resident had been banned from the facility ' +
          'for 30 days due to disrespect. She claimed she would bring politicians, the city of Rock Hill, United Way, ' +
          'and head of Allied Security to confront the member at her workplace. ' +
          'The safety team added Tia to the camera system as a person of interest and prepared a verbal response protocol ' +
          'in the event she appeared at church.',
        likelihood: 2,
        impact: 3,
        vulnerabilityNotes:
          'Church members who work in social services are exposed to individuals who may pose personal threats. ' +
          'Church is a predictable location for members.',
        incidentHistory:
          '11/22/25: Member notified team of threat. Person added to camera watchlist. ' +
          '11/23/25: Team placed on alert for Sunday service. Tia did not appear. No further incidents.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Medical Emergency — Congregant Syncope / Cardiac Event',
        description:
          'Multiple medical emergencies have occurred during services requiring trained response. ' +
          'On 3/23/25, Heather Henning passed out in the women\'s bathroom (~10:25 AM); recovered and transported home. ' +
          'On 9/14/25, a visiting member (Maria) experienced blood pressure and diabetes complications during service; ' +
          'her daughter transported her home. ' +
          'On 11/9/25, Lisa Waller experienced dizziness and chest discomfort during service; transported home by nurses. ' +
          'On 12/3/25 (Wednesday service), a woman experienced sudden dizziness, elevated HR and BP, difficulty breathing, ' +
          'and temporary loss of consciousness in the sanctuary. 911 was called at 6:43 PM; ' +
          'EMS arrived 19 minutes later. The delay and substandard EMS conduct were formally reported to Fort Mill EMS.',
        likelihood: 3,
        impact: 4,
        vulnerabilityNotes:
          'Church hosts 300+ congregants each Sunday. Medical response capacity depends on trained volunteers. ' +
          'EMS response time (19 min, 12/3/25) highlights need for on-site medical readiness including AED and glucose supplies. ' +
          'Nearest hospital and EMS unit response times should be mapped.',
        incidentHistory:
          '3/23/25: Heather Henning syncope in women\'s bathroom. Recovered, transported home. ' +
          '9/14/25: Maria (visitor) blood pressure/diabetes episode during service. Transported home by family. ' +
          '11/9/25: Lisa Waller dizziness and chest discomfort. Nurses transported her home. ' +
          '12/3/25: Woman collapsed during service. 911 called 6:43 PM; EMS arrived 7:00 PM (19 min). ' +
          'EMS conduct was dismissive of trained nurses on scene. Formal complaint submitted to Fort Mill EMS Operations Manager. ' +
          'Medical supplies: glucose strips replenished after being depleted in 12/3 incident.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Impaired / Mentally Unstable Individual on Property',
        description:
          'On 8/31/25 a visibly impaired individual was captured on camera playing basketball and soccer in the ' +
          'parking lot from approximately 9:21–9:25 PM, and appeared to attempt the garage side door. ' +
          'On 11/6/25 the Bible Study Fellowship group that meets at the church reported a man walking through ' +
          'the parking lot, muttering to himself, and appearing to examine vehicles. ' +
          'RHPD was called via non-emergency number, responded, identified the individual as mentally unstable ' +
          'and usually harmless, and told him to leave. Camera recording was incomplete due to network connectivity issues.',
        likelihood: 3,
        impact: 2,
        vulnerabilityNotes:
          'Parking lot is openly accessible from streets. Camera system had connectivity gaps. ' +
          'After-hours events (BSF, youth, college) leave staff and members potentially vulnerable.',
        incidentHistory:
          '8/31/25: Impaired individual in parking lot 9:21 PM, performed spin move at Sanctuary door, ' +
          'may have checked garage side door. ' +
          '11/6/25: Man muttering, examining vehicles during BSF meeting. Police called non-emergency; resolved. ' +
          '11/11/25: Police vehicle observed at church again at end of BSF (~8:07–8:30 PM); likely planned escort.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Regional / National Church Attack Threat Environment',
        description:
          'The safety team actively monitored regional and national church security incidents throughout the period, ' +
          'reflecting an elevated threat environment for houses of worship. Key incidents discussed: ' +
          '(1) 6/30/25: Conway teen charged with terrorism in an ISIS-linked bomb plot (local). ' +
          '(2) 6/30/25: Woman in Lancaster randomly murdered by six teens, youngest aged 13. ' +
          '(3) 7/13/25: Gunman killed 2, wounded 2 at a Lexington, KY church after shooting a state trooper. ' +
          '(4) 8/27/25: Gunman opened fire at a Catholic church through windows; approximately 20 victims. ' +
          '(5) 9/28/25: Gunman drove vehicle through front doors of Grand Blanc, MI church; shot 10 people (1 fatal); ' +
          'set church on fire; suspect neutralized. Vehicle-ramming and fire used together. ' +
          '(6) 1/18/26: Anti-ICE protesters stormed a Minneapolis church during service. ' +
          '(7) 2/28/26: York County news article documented two separate security incidents at nearby churches.',
        likelihood: 3,
        impact: 5,
        vulnerabilityNotes:
          'National trend of targeted violence against houses of worship is well-documented. ' +
          'Grand Blanc attack demonstrated that armed interior teams may not be sufficient without perimeter barriers ' +
          '(vehicle ramming) and early warning (shooting through windows). ' +
          'Local Conway ISIS plot demonstrates regional extremist activity.',
        incidentHistory:
          'All dates documented in chat monitoring of news sources. ' +
          'Team discussion of bollards (vehicle barriers) initiated after Grand Blanc attack (9/28/25). ' +
          'Regional threat context supports NSGP funding request.',
        source: 'self_assessed',
      },

      // ── CAB ──────────────────────────────────────────────────────────────

      {
        siteId: CAB,
        threatType: 'Unauthorized Access / Unsecured Entry Points',
        description:
          'Multiple instances of unlocked or unsecured doors at the CAB were identified during services. ' +
          'On 2/16/25, during a window installation project, doors providing roof-level access were found unlocked ' +
          '(15 feet in the air via scaffolding). A team member locked the downstairs door. ' +
          'On 3/2/25 a storage area near the CAB was found unlocked and open approximately one foot. ' +
          'The back door to the building was found to have no lock on the knob and no latch for a padlock (7/8/25). ' +
          'These vulnerabilities create easy unauthorized access opportunities.',
        likelihood: 4,
        impact: 3,
        vulnerabilityNotes:
          'CAB has multiple exterior entry points, some not consistently secured. ' +
          'Contractor work during services creates temporary security gaps. ' +
          'Back door had no functional locking mechanism prior to 7/9/25 remediation.',
        incidentHistory:
          '2/16/25: CAB stairwell doors unlocked during rooftop window installation. Team member secured. ' +
          '3/2/25: Storage area door found unlocked and ajar. No known unauthorized entry. ' +
          '7/8/25: Back exterior door identified as having no lock or padlock hasp. ' +
          '7/9/25: Combo padlock (code 1907) approved by deacons and installed. ' +
          '9/8/25: Small dog observed being carried inside CAB during Friday movie night and other events (liability/hygiene concern). ' +
          '10/15/25: Blanco family dog bit child (Adah Hinson) in outdoor play area. No-pets policy recommended.',
        source: 'self_assessed',
      },

      {
        siteId: CAB,
        threatType: 'Harassing / Disturbing Individual at CAB Events',
        description:
          'During VBS on 7/8/25 an individual arrived at the CAB and engaged in belligerent theological arguments ' +
          'with snack table volunteers. He had no children in the program, drove a black Lexus SUV with Revelation-themed ' +
          'bumper stickers, and carried a Bible. He was eventually asked to leave by safety team members (JW and James Roach). ' +
          'This was the first of multiple incidents involving Joshua David Taft (see main building threat entry). ' +
          'Separately, on 7/8/25 "Danny" (homeless, sometimes intoxicated) was present near the CAB during VBS. ' +
          'A separate VBS evening disruption: a man appeared with no children and engaged in belligerent behavior ' +
          'with volunteers at the snack table.',
        likelihood: 3,
        impact: 3,
        vulnerabilityNotes:
          'CAB events (VBS, youth gatherings) attract large numbers of children and families. ' +
          'Open garage-style access during warm-weather events makes it easy for uninvited individuals to approach. ' +
          'Limited safety team coverage during multi-room/multi-building events.',
        incidentHistory:
          '7/8/25: VBS disruption — Taft confronted volunteers, approached children through vehicle window. ' +
          'Responded to by JW (Jeremy Hollingsworth) and James Roach. Taft left without further incident. ' +
          '7/8/25: Danny (known transient, sometimes intoxicated) present near building; spoken to by Robert Baker; harmless. ' +
          '9/3/25: Taft returned to CAB area at 6:27 PM; formally trespassed by team.',
        source: 'self_assessed',
      },

      // ── GARAGE / WHITE STREET LOT ─────────────────────────────────────────

      {
        siteId: GARAGE,
        threatType: 'Threatening Confrontation at Youth/College Event',
        description:
          'On 12/19/25 during a college Christmas gathering at the renovated garage, an unknown man walked ' +
          'onto the property from the adjacent area, entered the garage, began yelling and causing a scene, ' +
          'and threatened to "f up" Pastor Patrick in the parking lot. Patrick confronted the individual and ' +
          'forced him to leave. No physical altercation occurred. ' +
          'The garage had open doors at the time. Camera footage was limited — parking lot and fisheye cameras ' +
          'were experiencing network connectivity issues, and no garage-specific camera was installed at that time. ' +
          'A separate report (unverified) suggested the individual may have threatened to stab Patrick. ' +
          'Approximate description: Black male, mid-40s to early 50s. Police were not called due to insufficient ' +
          'identifying information and elapsed time.',
        likelihood: 3,
        impact: 4,
        vulnerabilityNotes:
          'Garage is adjacent to a field and pedestrian access routes. ' +
          'Open garage doors during events are highly visible from the street and field, inviting uninvited visitors. ' +
          'No dedicated camera coverage of the garage interior or immediate exterior at time of incident. ' +
          'Event was not listed on Planning Center, so safety team was not formally scheduled.',
        incidentHistory:
          '12/19/25 7:26–7:28 PM: Unknown man threatened Patrick at college Christmas gathering. ' +
          'Patrick physically compelled the man to leave. ' +
          '12/19/25: Safety team discussed requiring a formal Safety Team presence at all future events. ' +
          'Garage fisheye camera relocated to corner with better exterior coverage (2/8/26). ' +
          'Live-feed TV monitor installed in garage to show exterior cam feed (2/13/26). ' +
          '1/16/26: Deacons discussed requiring garage events to close doors or relocate to CAB/main building.',
        source: 'self_assessed',
      },

      {
        siteId: GARAGE,
        threatType: 'Unauthorized Access / Open Perimeter',
        description:
          'The garage and surrounding field have no fencing or physical barriers separating them from public ' +
          'pedestrian routes. Individuals have repeatedly accessed the property from the adjacent field, ' +
          'including the woman observed walking in the play area at 6:16 AM (6/16/25 — turned out to be a deer 😄), ' +
          'and various individuals described in other threat entries. ' +
          'A fence between the CAB and garage was discussed extensively by the deacons and safety team starting in ' +
          'January 2026 as the primary physical security improvement needed. ' +
          'The prior fence in this location was removed approximately 15 years ago.',
        likelihood: 4,
        impact: 3,
        vulnerabilityNotes:
          'No physical barrier separates church property from adjacent field. ' +
          'Three street-level access points to the field. ' +
          'Foot traffic through the parking lot from the field is continuous and unmonitored. ' +
          'Fencing the north side of the field between the CAB and garage was identified as the highest-impact ' +
          'physical security improvement available.',
        incidentHistory:
          '12/19/25: Threatening individual walked in from adjacent area during college event. ' +
          '1/16/26: Team and deacons discussed fence between CAB and garage. ' +
          'Historical note: A fence previously existed in this location and was removed ~15 years ago.',
        source: 'self_assessed',
      },

    ],
  })

  console.log(`✅  Created ${threats.count} threat assessments`)

  // ─── SITE OBSERVATIONS ───────────────────────────────────────────────────

  const obs = await prisma.siteObservation.createMany({
    data: [

      // ── MAIN BUILDING ────────────────────────────────────────────────────

      {
        siteId: MAIN,
        title: 'Walkie-Talkie Battery Failures — Multiple Units',
        locationDescription: 'Radio charger station / common storage area',
        observationType: 'Equipment Deficiency',
        severity: 3,
        notes:
          'As of 3/2/25 two of six walkie-talkies had dead or non-charging batteries. ' +
          'Earpiece failure also noted (Nathan Anderson, 3/2/25 — missing part). ' +
          'Battery failures recurred: 9/21/25 the large 6-radio charger was found unplugged, leaving all 6 radios dead at service start. ' +
          'On 10/26/25 (evacuation drill day) radios died during the drill due to dead batteries. ' +
          'Additional radio units and batteries ordered 11/2/25. ' +
          'Recommenation: Establish a weekly radio check and charging protocol.',
      },

      {
        siteId: MAIN,
        title: 'Building-Wide Evacuation Alert System — Severely Limited',
        locationDescription: 'Building intercom/buzzer system; check-in desk',
        observationType: 'Life Safety Deficiency',
        severity: 4,
        notes:
          'The existing buzzer system (at the children\'s check-in desk) has three buttons but only one is functional, ' +
          'and it activates a single buzzer on the third-floor landing between two hallways — insufficient to alert ' +
          'the full building in an emergency. ' +
          'The audio system can reach the sanctuary but not classrooms, nurseries, or the CAB. ' +
          'UniFi 120 dB bullhorn devices were proposed as a potential solution to cover all areas. ' +
          'A fire drill was conducted on 10/26/25 using a manually triggered audio simulation; ' +
          'full building evacuation in 92 seconds (sanctuary/balcony area only). ' +
          'Recommendation: Install networked audio alert devices (UniFi or equivalent) in all rooms and buildings.',
      },

      {
        siteId: MAIN,
        title: 'Camera Blind Spots — Multiple Critical Areas',
        locationDescription: 'Rear of building, back door area, woods, office window',
        observationType: 'Physical Security Gap',
        severity: 4,
        notes:
          'Several security events occurred outside existing camera coverage: ' +
          '(1) Attempted break-in to pastor\'s office window (7/8/25) — out of camera view. ' +
          '(2) Woods/rear property — no camera coverage (ongoing). ' +
          '(3) Storage shed / back door area — limited coverage. ' +
          'Team created a camera placement diagram (8/10/25) mapping current coverage angles. ' +
          'Ring doorbells at CAB and Sanctuary are not integrated into the main UniFi NVR system. ' +
          'Five new higher-resolution cameras were acquired and being installed as of late 2025. ' +
          'Recommendation: Expand UniFi camera system to cover rear property, back door, and garage exterior.',
      },

      {
        siteId: MAIN,
        title: 'Dangerous Stairs — Injury Incident',
        locationDescription: 'Interior stairs (second floor area)',
        observationType: 'Slip/Fall Hazard',
        severity: 3,
        notes:
          'On 8/21/25 a child (Esther) sprained her fifth metatarsal after falling on interior church stairs. ' +
          'Team member Kara Roach responded and assessed the injury. Esther was placed in a boot. ' +
          'A caution strip on the stairs was proposed. ' +
          'Recommendation: Add non-slip caution strips or grip tape to stairs; audit all interior stair surfaces.',
      },

      {
        siteId: MAIN,
        title: 'Handrail Missing — Women\'s Bathroom Stalls',
        locationDescription: 'Women\'s restroom',
        observationType: 'Accessibility / Fall Hazard',
        severity: 2,
        notes:
          'Church member Betty Folsom requested handrails be added to women\'s bathroom stalls (8/30/25). ' +
          'Recommendation forwarded to Dave (staff) and the deacon liaison. ' +
          'Recommendation: Install grab bars/handrails in women\'s bathroom stalls.',
      },

      {
        siteId: MAIN,
        title: 'No Trespassing / Camera Surveillance Signage Absent',
        locationDescription: 'Property perimeter, playground area, rear of building',
        observationType: 'Deterrence Gap',
        severity: 3,
        notes:
          'Following repeated nighttime trespassing incidents in May 2025, team discussed adding "No Trespassing" ' +
          'and camera surveillance signage. Elder consultation on trespassing sign tone was ongoing. ' +
          'Team noted signs should be visible but not located at camera positions. ' +
          'As of the chat history, signage had not been formally installed on the perimeter. ' +
          'Recommendation: Post camera surveillance signs and consult elders on No Trespassing language at all exterior access points.',
      },

      {
        siteId: MAIN,
        title: 'Inadequate Exterior Lighting — Rear Field Area',
        locationDescription: 'Rear field and parking area adjacent to church property',
        observationType: 'Perimeter Lighting',
        severity: 3,
        notes:
          'Deacon Robert Baker proposed asking the City of Rock Hill to mount lights on power poles in the field ' +
          'behind the church for safety purposes (11/30/25 meeting). ' +
          'The rear field is used as an informal walkway and is not illuminated at night, ' +
          'contributing to the pattern of nocturnal unauthorized access. ' +
          'Recommendation: Request city-installed lighting on power poles in adjacent field; evaluate add-on lighting on church exterior.',
      },

      {
        siteId: MAIN,
        title: 'Door Signage Absent — Side Entrance Locked During Services',
        locationDescription: 'Side entrance door to main building',
        observationType: 'Visitor Access / Communication Gap',
        severity: 2,
        notes:
          'The side entrance is locked once service begins, but no signage directs latecomers to the main entrance. ' +
          'Congregants reported banging on the locked door in a panic (12/14/25 report). ' +
          'Vinyl signage was proposed and fabricated by James Roach ("If locked, use main entrance →") for installation. ' +
          'Recommendation: Permanent directional signage at all secondary doors that lock during service.',
      },

      {
        siteId: MAIN,
        title: 'Church App / Membership Access Audit Needed',
        locationDescription: 'Digital — Planning Center / Church App',
        observationType: 'Information Security',
        severity: 2,
        notes:
          'As of 9/27/25 the church app contained numerous individuals who were no longer active members, ' +
          'including former members who had transferred or were in the process of transferring. ' +
          'These individuals retained access to church member contact information. ' +
          'An audit against the current membership roll was recommended. ' +
          'Recommendation: Conduct annual audit of church app and private Facebook group memberships against current membership roll.',
      },

      // ── CAB ──────────────────────────────────────────────────────────────

      {
        siteId: CAB,
        title: 'Parking Lot Camera — Chronic Connectivity Issues',
        locationDescription: 'Exterior parking lot camera at CAB',
        observationType: 'Equipment Deficiency',
        severity: 3,
        notes:
          'The parking lot camera experienced frequent network dropout throughout 2025 due to a wireless connection ' +
          'from the CAB to the main building. This left coverage gaps precisely during the high-risk overnight hours ' +
          'when incidents were recorded. ' +
          'On 12/30/25, fiber optic cable was successfully run from the main building to the CAB, eliminating the wireless dependency. ' +
          'New higher-resolution cameras installed on 12/31/25 dramatically improved image quality. ' +
          'Recommendation: Maintain fiber infrastructure; add additional cameras to close remaining blind spots.',
      },

      {
        siteId: CAB,
        title: 'Unsafe Electrical Work — Exposed Romex and AC Drip on Battery',
        locationDescription: 'Exterior mini-split installation area at new garage addition',
        observationType: 'Safety Hazard',
        severity: 3,
        notes:
          'On 8/24/25 a team member noticed several safety issues outside the CAB during the mini-split installation: ' +
          'exposed Romex wiring and a drip line draining onto a battery left outside. ' +
          'The contractor\'s work appeared unfinished. The old battery was moved. ' +
          'Recommendation: Ensure electrical contractors complete all work to code before handoff; inspect exposed wiring.',
      },

      {
        siteId: CAB,
        title: 'No Pet Policy Unenforced — Dog Bite Incident',
        locationDescription: 'Outdoor children\'s play area; interior CAB',
        observationType: 'Policy / Liability Gap',
        severity: 3,
        notes:
          'Multiple dogs were brought onto the property in 2025 despite an existing informal policy. ' +
          '10/15/25: The Blanco family\'s dog bit a child (Adah Hinson) in the outdoor play area. ' +
          'The formal no-pets policy was recommended to elders/deacons for ratification. ' +
          '12/16/25: The CAB resident (Cierra Baird) walked a dog through the CAB building including into the kitchen. ' +
          'Elder spoke with the resident; apology received. ' +
          'Recommendation: Formalize and communicate no-pets-on-property policy through elder/deacon channels and include in facility use agreements.',
      },

      // ── GARAGE / WHITE STREET LOT ─────────────────────────────────────────

      {
        siteId: GARAGE,
        title: 'No Fencing — Open Field Access to Property',
        locationDescription: 'North side of property between CAB and garage',
        observationType: 'Perimeter Security Gap',
        severity: 4,
        notes:
          'There is no fencing or physical barrier separating the church\'s main property from the adjacent field ' +
          'and surrounding streets on the north side. Foot traffic from the field into the parking lot and garage area ' +
          'is continuous and uncontrolled. A fence previously existed in this location but was removed ~15 years ago. ' +
          'The deacon body discussed reinstating a fence from the CAB edge to the garage as the highest-impact ' +
          'perimeter improvement available. Estimated to require one gate. ' +
          'A fence along the full north field boundary would be more comprehensive but significantly more expensive. ' +
          'Recommendation: Install a fence (with gated access) from CAB to garage on north property boundary to redirect foot traffic.',
      },

      {
        siteId: GARAGE,
        title: 'No Dedicated Camera — Garage Interior and Immediate Exterior',
        locationDescription: 'Renovated garage building',
        observationType: 'Physical Security Gap',
        severity: 4,
        notes:
          'At the time of the 12/19/25 threatening confrontation during a college event, no camera covered ' +
          'the garage interior or its immediate exterior. ' +
          'The parking lot fisheye camera and main building Sanctuary cam provided only partial coverage with ' +
          'network dropout issues. ' +
          'Remediation progress: ' +
          '2/8/26: CAB fisheye camera repositioned to corner of garage for improved exterior view. ' +
          '2/13/26: Live-feed TV monitor installed above garage door to display exterior camera feed for occupants. ' +
          '1/26: New high-resolution cameras were acquired and slated for exterior installation. ' +
          'Recommendation: Install dedicated cameras on garage exterior (multiple angles) integrated into the UniFi NVR system.',
      },

    ],
  })

  console.log(`✅  Created ${obs.count} site observations`)

  // ─── EXISTING SECURITY MEASURES ──────────────────────────────────────────

  const measures = await prisma.existingSecurityMeasure.createMany({
    data: [

      // ── MAIN BUILDING ────────────────────────────────────────────────────

      {
        siteId: MAIN,
        category: 'Communications',
        description:
          'Six-unit two-way radio (walkie-talkie) system with earpiece/earphone accessories. ' +
          'Used by safety team members to coordinate during services and events. ' +
          'Earpieces ordered for all members as of 9/2/25. ' +
          'New units and charging station ordered 11/2/25 to replace failing batteries.',
        effectivenessRating: 3,
        gapsRemaining:
          'Charging failures have occurred on multiple occasions. ' +
          'Standardized charging protocol not yet established. ' +
          'Not all team members are consistently mic\'d up during service (e.g., Keith Doster unable to use earpiece).',
        notes: 'Radio check by name at service start recommended and partially implemented.',
      },

      {
        siteId: MAIN,
        category: 'Video Surveillance',
        description:
          'UniFi Protect NVR camera system with multiple interior and exterior cameras including: ' +
          'Parking lot camera, playground/outdoor area camera, outdoor fisheye camera (360°), ' +
          'Sanctuary entrance area camera, additional UniFi cameras throughout building. ' +
          'Ring doorbells at Sanctuary and CAB entrances (separate from UniFi system). ' +
          'System upgraded to new NVR hardware 9/25/25 (additional storage/performance). ' +
          'Cameras accessible via UniFi Protect mobile app by authorized team members. ' +
          'Person-of-interest tagging feature enabled for known threat individuals. ' +
          'New high-resolution cameras installed 12/31/25 (significant image quality improvement). ' +
          'Fiber optic connection to CAB completed 12/30/25 for reliable connectivity.',
        effectivenessRating: 3,
        gapsRemaining:
          'Multiple blind spots remain: rear of building, back door area, woods, garage interior. ' +
          'Parking lot cam had chronic connectivity issues prior to fiber installation. ' +
          'Ring doorbells not integrated with main NVR. ' +
          'No cameras in wooded area or rear property boundary.',
        notes:
          'Camera map created 8/10/25 overlaid on building schematic. ' +
          'Additional cameras planned: garage exterior, rear property. ' +
          'Garage camera monitor installed 2/13/26.',
      },

      {
        siteId: MAIN,
        category: 'Access Control',
        description:
          'Manual door locking protocol: sanctuary and other doors locked at the start of worship service. ' +
          'Combination padlock (code 1907) installed on back storage door (7/9/25). ' +
          'Carry authorization list maintained for church members approved to carry concealed firearms on property. ' +
          'Formal trespass notice process established in coordination with RHPD.',
        effectivenessRating: 3,
        gapsRemaining:
          'Side entrance lacks signage when locked, causing confusion for latecomers. ' +
          'No electronic or key-fob access control on any entry. ' +
          'Back property doors (non-primary entries) may not be consistently secured. ' +
          'Trespass notices are only valid for one year per RHPD policy.',
        notes:
          'One formal trespass notice executed (Joshua David Taft, 9/22/25, valid through ~9/22/26). ' +
          'Door signage ("If locked, use main entrance") fabricated in vinyl by James Roach (12/21/25). ' +
          'Childcare rooms have safety door locks per Kara and JW Roach request (8/5/25).',
      },

      {
        siteId: MAIN,
        category: 'Personnel — Armed Security',
        description:
          'Volunteer safety team with multiple members holding SC Concealed Weapons Permits (CWPs) authorized ' +
          'by the church elders to carry on property. Rotation schedule maintained via Planning Center Services. ' +
          'Two members on duty each Sunday (one during Sunday School, one during service). ' +
          'Team also serves at youth, college, and special events.',
        effectivenessRating: 3,
        gapsRemaining:
          'Coverage relies entirely on volunteer availability; gaps occur when members are unavailable. ' +
          'No paid/off-duty law enforcement presence (2026 budget request for RHPD officer was declined by elders). ' +
          'All-volunteer team limits consistency of coverage. ' +
          'Not all events receive safety team coverage; some events not tracked in Planning Center.',
        notes:
          'Team grew from ~6 to ~12+ members over 2025. ' +
          'Firearm training planned: 11/15/25 at Pappy\'s range, Edgemoor, with Palmetto Patriot Firearms Training. ' +
          'Background checks initiated for all team members (1/15/26). ' +
          'Carry authorization list maintained and updated; deacons and elders hold master list.',
      },

      {
        siteId: MAIN,
        category: 'Personnel — Medical',
        description:
          'Medical sub-team of safety team includes trained nurses and medical professionals. ' +
          'Amber Hinson (RN) and Kara Roach (ER nurse) are primary responders. ' +
          'Medical supplies on hand include first aid kit and basic assessment equipment. ' +
          'Epipens are maintained for three identified children (two in nursery, one in elementary class).',
        effectivenessRating: 3,
        gapsRemaining:
          'Three medical team members departed in 2025, leaving gaps. ' +
          'Glucose monitoring strips depleted and needed reorder (12/3/25). ' +
          'No AED (automated external defibrillator) explicitly confirmed on-premises. ' +
          '19-minute EMS response time documented (12/3/25); on-site readiness critical. ' +
          'Medical coverage of off-campus events (bowling trips, etc.) not addressed.',
        notes:
          'Glucose strips reordered after 12/3/25 medical emergency. ' +
          'USCCA "Protecting Your House of Worship" training attended by Keith Doster, Rich Flagler, McGill Hutto (9/2025). ' +
          'SLED offers Stop the Bleed and active shooter response training (referenced 3/1/26).',
      },

      {
        siteId: MAIN,
        category: 'Policies and Procedures',
        description:
          'Safety Team Policy & Procedures document (elder-approved as of 7/13/25). ' +
          'Emergency Floor Plan and Emergency Procedures documents created 8/29/25. ' +
          'Updated Emergency Evacuation Plan distributed to congregation 10/13/25. ' +
          'Registered Sex Offender Policy developed 11/21/25 and on path to congregational vote. ' +
          'Fire/evacuation drill conducted 10/26/25 (92 seconds, sanctuary/balcony). ' +
          'Carry authorization list maintained by safety team leader. ' +
          'Incident documentation (Unifi camera case system) in use.',
        effectivenessRating: 4,
        gapsRemaining:
          'RSO policy not yet voted on by congregation as of chat history end. ' +
          'No formal process for events to request safety team presence (in progress via Planning Center). ' +
          'Pet policy not yet formally ratified by elders/deacons. ' +
          'Building use agreement for renters/events needs safety requirements added.',
        notes:
          'Team policy under review by Brian Thompson (1/27/26). ' +
          'Active Shooter / CCTA training available from SLED (free, at local sites) — recommended to leadership 3/1/26.',
      },

      // ── CAB ──────────────────────────────────────────────────────────────

      {
        siteId: CAB,
        category: 'Video Surveillance',
        description:
          'CAB is connected to the main UniFi camera network via fiber optic cable (installed 12/30/25). ' +
          'High-resolution exterior cameras installed 12/31/25. ' +
          'Ring doorbell at CAB main entrance. ' +
          'Prior to 12/30/25, CAB camera connection was wireless and experienced frequent dropout.',
        effectivenessRating: 3,
        gapsRemaining:
          'Interior CAB coverage unclear. ' +
          'Rear/side of CAB has limited or no coverage. ' +
          'Ring doorbell remains on separate system from main UniFi NVR.',
        notes: 'Fiber infrastructure upgrade completed by Brian Thompson and Jeremy Hollingsworth (12/30–31/25).',
      },

      {
        siteId: CAB,
        category: 'Access Control',
        description:
          'Combination padlock installed on rear exterior door (7/9/25). ' +
          'Door locking protocol during services extended to CAB side entrance, nursery, and basement (noted by McGill Hutto 3/30/25). ' +
          'VBS and special events staffed by safety team members in addition to program volunteers.',
        effectivenessRating: 2,
        gapsRemaining:
          'Multiple entry points at CAB; consistent locking is dependent on team discipline. ' +
          'No electronic access control. ' +
          'Contractor and occupant (Baird family) access to building requires additional policy framework ' +
          '(firearm storage in occupied unit, pet policy, building use agreement).',
        notes:
          'Children\'s area classrooms have individual safety door locks installed at Kara Roach\'s request (8/5/25). ' +
          'CAB childcare rooms have walkie-talkies to receive notifications during services.',
      },

      // ── GARAGE ────────────────────────────────────────────────────────────

      {
        siteId: GARAGE,
        category: 'Video Surveillance',
        description:
          'Fisheye camera repositioned to corner of garage for improved exterior view (2/8/26). ' +
          'Live-feed TV monitor installed above garage doors to display exterior cam footage (2/13/26). ' +
          'Main parking lot camera coverage extends to part of garage approach area.',
        effectivenessRating: 2,
        gapsRemaining:
          'No camera covers the full garage exterior perimeter. ' +
          'Interior of garage has no camera. ' +
          'Limited camera resolution prior to hardware upgrades. ' +
          'No notification/alert coverage of garage area.',
        notes:
          'Five new cameras acquired and slated for additional exterior installation. ' +
          'Garage monitor gives occupants visibility of exterior approach.',
      },

      {
        siteId: GARAGE,
        category: 'Access Control',
        description:
          'Garage doors can be opened or closed manually. ' +
          'Team discussed requiring closed doors during all events, especially evening gatherings. ' +
          'Ryan Smith (safety team member) attends many college events and carries.',
        effectivenessRating: 2,
        gapsRemaining:
          'Garage is currently the most accessible and least secure of the three buildings. ' +
          'No fencing separating it from the adjacent field. ' +
          'Events held with open garage doors provide no visual deterrent to approach. ' +
          'No formal door-closure policy for events has been ratified.',
        notes:
          'Garage window panels being evaluated to allow natural light and visibility with doors closed. ' +
          'Patrick Baird prefers open doors for sightlines; camera monitor may address this preference.',
      },

    ],
  })

  console.log(`✅  Created ${measures.count} existing security measures`)
  console.log('\n🎉  Seeding complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
