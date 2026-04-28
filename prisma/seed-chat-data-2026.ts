/**
 * seed-chat-data-2026.ts
 *
 * Addendum seed: picks up where seed-chat-data.ts left off.
 * Covers March 13 – April 26, 2026 incidents missed in the first pass.
 *
 * Run:
 *   node --env-file=.env -e "
 *     require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'node',target:'ES2020'}});
 *     require('./prisma/seed-chat-data-2026.ts');
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

const MAIN   = 'cmo45z961000004jrhmd7p6su'
const CAB    = 'cmo45zwat000004jxj0aq1c6o'
const GARAGE = 'cmo463xbi000004jj788dhe85'

async function main() {
  console.log('🌱  Seeding 2026 addendum data...\n')

  // ─── THREAT ASSESSMENTS (ADDENDUM) ───────────────────────────────────────

  const threats = await prisma.threatAssessment.createMany({
    data: [

      {
        siteId: MAIN,
        threatType: 'Violent / Threatening Recurring Individual — "Charles"',
        description:
          '"Charles" is an individual (approximate height 5\'6", often incoherent speech) who began ' +
          'appearing on church property in April 2026, escalating rapidly from nuisance to a credible physical threat. ' +
          'On 4/8/26 he was escorted off the property during a Wednesday service after communicating incoherently. ' +
          'On 4/12/26 he returned during an evening service and explicitly threatened to "knock everyone out" — ' +
          'he had to be physically restrained (arms held) by team members Robert Baker and Bobby before being removed. ' +
          'He returned the same evening to a Bible study and was escorted off again. ' +
          'On 4/13/26 he returned to the women\'s Bible study and was noted as aggressive. ' +
          'By 4/14/26 leadership instructed team to lock all doors during day and Bible study hours. ' +
          'On 4/15/26 a suspicious individual (possibly Charles) was observed on camera at 11:52 PM on a bike ' +
          'tampering near the garage door and Patrick Baird\'s SUV. ' +
          'An arrest record/mug shot was obtained (4/20/26). ' +
          'Charles was released from jail and appeared again at the women\'s Bible study on 4/21/26 (~8:12 PM); ' +
          'he was escorted off by Joe and Chris who threatened to call police; audio captured him howling/yelling. ' +
          'He returned on 4/22/26 and was warned by the team leader to stay on the sidewalk; he complied and left. ' +
          'On 4/24/26 Charles was arrested again. On the same day, RHPD conducted a formal security assessment of the property.',
        likelihood: 5,
        impact: 4,
        vulnerabilityNotes:
          'Evening Bible studies and off-peak events have reduced safety team coverage. ' +
          'Women\'s Bible study attendees are particularly vulnerable as an all-female group. ' +
          'Church property has multiple unlocked entry points prior to door-locking protocol adjustment. ' +
          'The individual demonstrated willingness to return repeatedly even after being confronted and warned. ' +
          'Arrest record obtained but formal trespass notice pending as of chat history end. ' +
          'No fence or barrier separates the sidewalk and church property approaches.',
        incidentHistory:
          '4/8/26: Charles escorted off during Wednesday service. Incoherent. ' +
          '4/12/26: Charles returned. Threatened to "knock everyone out." Physically restrained by Robert Baker and Bobby. ' +
          '4/12/26 (evening): Returned to Bible study. Escorted off again. ' +
          '4/12/26: RHPD Officer Gander visited; said no action possible without 911 call during an incident. ' +
          '4/13/26: Returned to women\'s Bible study. Aggressive. ' +
          '4/14/26: Leadership locked all doors during daytime and Bible study hours. Charles was aggressive the prior evening per team. ' +
          '4/15/26 11:52 PM: Bicycle rider (possibly Charles) tampered near garage door and vehicle. ' +
          '4/20/26: Arrest record/mug shot obtained by team. ' +
          '4/21/26 ~8:12 PM: Released from jail; appeared at women\'s Bible study; howling/yelling captured on audio; escorted off. ' +
          '4/22/26: Appeared on sidewalk at church; warned to move on by team leader; complied. ' +
          '4/24/26: Charles arrested again. RHPD conducted security assessment of church property same day.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Joshua David Taft — Escalated Regional Activity',
        description:
          'Joshua David Taft (already trespassed from Park through 9/22/26) continued and escalated activity in ' +
          'the broader community in early 2026. On 3/16/26 Rock Hill area churches received a formal alert from ' +
          'Pastor Dave that Taft had appeared at Life Pointe Church in Fort Mill the prior day. ' +
          'His vehicle changed from a black Lexus to a white Acura SUV but retained the distinctive Revelation-themed bumper stickers. ' +
          'On 3/31/26 a church member discovered that Taft had distributed heretical pamphlets in the mailboxes ' +
          'of church members\' homes on Ebinport Road and surrounding streets — demonstrating he had obtained or researched ' +
          'members\' home addresses. ' +
          'On the same day, Taft approached a group of Park Baptist high school boys at a local restaurant (El Cancun) ' +
          'and engaged them with the same heretical materials. The boys engaged him Biblically and he was unable to out-argue them. ' +
          'Taft is actively and systematically targeting the congregation beyond church property.',
        likelihood: 3,
        impact: 3,
        vulnerabilityNotes:
          'Taft has demonstrated awareness of church members\' home addresses (mailbox distribution). ' +
          'He is targeting youth (high school boys at restaurant) outside of church property. ' +
          'His behavior is escalating and systematic — not random. ' +
          'Trespass notice valid until 9/22/26 for church property but does not cover members\' homes or public spaces. ' +
          'He changed vehicles (now white Acura SUV) to evade identification.',
        incidentHistory:
          '3/16/26: YBA/Pastor Dave alert — Taft at Life Pointe Church Fort Mill (3/15/26). ' +
          'Vehicle confirmed: white Acura SUV with Revelation bumper stickers (changed from black Lexus). ' +
          '3/31/26: Taft distributed pamphlets to church members\' mailboxes on Ebinport Rd and neighboring streets. ' +
          '3/31/26: Taft approached Park Baptist high school boys at El Cancun restaurant; gave them same pamphlets; ' +
          'boys engaged him Biblically and he left. ' +
          'Prior: Park trespass in effect until 9/22/26. If he enters church property, 911 to be called for arrest.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Elevated Regional Threat — Iran-Inspired / ISIS Religious Targeting',
        description:
          'On 3/13/26 team member Robert Baker shared intelligence of recent reports of individuals inspired by ' +
          'events in Iran planning to attack and threaten religious groups — specifically not limited to the Jewish ' +
          'community but also Christian congregations. ' +
          'On 4/5/26 (Holy Saturday — day before Easter), team member Jeremy Hollingsworth shared a news report ' +
          'that ISIS had issued a worldwide call for attacks on churches and synagogues at Easter. ' +
          'Team leadership placed extra vigilance protocols for Easter weekend services. ' +
          'This follows the earlier documented Conway, SC ISIS-linked bomb plot (6/30/25) and the ' +
          'anti-ICE church storming in Minneapolis (1/18/26), reflecting a sustained national pattern of ' +
          'targeted ideologically-motivated threats to houses of worship.',
        likelihood: 2,
        impact: 5,
        vulnerabilityNotes:
          'Church hosts 300+ congregants during Easter and major holiday services — highest attendance of the year. ' +
          'No law enforcement officer present during services. ' +
          'Open parking lot and accessible approaches create vulnerability to vehicle-based or walk-up attacks. ' +
          'Limited camera coverage on rear and west side of property.',
        incidentHistory:
          '3/13/26: Intelligence shared re: Iran-inspired threats to Christian congregations. ' +
          '4/5/26: ISIS worldwide Easter attack call confirmed by Premier Christian News. ' +
          'Extra vigilance maintained for Easter weekend services (4/5–4/6/26). ' +
          'Historical context: Conway, SC ISIS bomb plot 6/30/25; anti-ICE church storming 1/18/26.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Property Vandalism — Vehicle Egging',
        description:
          'On 3/29/26 a church staff member (Jennifer Shellenberger, Children\'s Director) discovered her van ' +
          'had been egged while parked in the church parking lot during a Sunday members\' meeting. ' +
          'The egging was on the side of the vehicle not facing the street, suggesting either someone on the ' +
          'property or deliberate targeting from within the lot. Approximately 2–4 eggs were used. ' +
          'No camera coverage existed on that side of the building. ' +
          'The incident was unresolved — it was raised in the members\' meeting but no one admitted to it. ' +
          'The team noted the egg appeared baked on (sun exposure), indicating it had been there for some time ' +
          'before discovery.',
        likelihood: 2,
        impact: 2,
        vulnerabilityNotes:
          'West/side of building has no camera coverage. ' +
          'Parking lot is accessible from the street and field without control. ' +
          'Staff vehicles parked near building may be identifiable targets.',
        incidentHistory:
          '3/29/26: Jennifer Shellenberger\'s van found egged in church parking lot after service. ' +
          'Side not facing street targeted — ~2–4 eggs. No suspect identified. ' +
          'Camera coverage gap confirmed on that side of building. ' +
          'Incident raised at members\' meeting; no admission obtained.',
        source: 'self_assessed',
      },

      {
        siteId: MAIN,
        threatType: 'Medical Emergency — Incident at Garage During Service',
        description:
          'On 3/15/26 during a Sunday morning service, a medical emergency occurred at the garage area of the property. ' +
          'The exact nature was not fully documented in the chat, but team members responded urgently — ' +
          'Robert Baker radioed for Kara Roach and Amber Hinson, both nurses, who responded immediately with medical bags. ' +
          'The patient was assessed and moved to Victor\'s office. The situation was resolved without EMS. ' +
          'This incident highlights the need for consistent trained medical presence across all active buildings ' +
          'during services and events.',
        likelihood: 3,
        impact: 3,
        vulnerabilityNotes:
          'Medical emergencies can occur in any building on the campus. ' +
          'During large services the garage may house Sunday School classes or overflow attendees. ' +
          'Medical team response depends on radio communication across buildings.',
        incidentHistory:
          '3/15/26 ~10:02 AM: Medical emergency at garage. ' +
          'Robert Baker radioed for Kara Roach and Amber Hinson. Both responded with medical bags. ' +
          'Patient assessed in Victor\'s office. No EMS required. Fully resolved.',
        source: 'self_assessed',
      },

    ],
  })

  console.log(`✅  Created ${threats.count} additional threat assessments`)

  // ─── SITE OBSERVATIONS (ADDENDUM) ────────────────────────────────────────

  const obs = await prisma.siteObservation.createMany({
    data: [

      {
        siteId: MAIN,
        title: 'RHPD Security Assessment Completed — Recommendations Pending',
        locationDescription: 'Full property — all buildings',
        observationType: 'Law Enforcement Assessment',
        severity: 5,
        notes:
          'On 4/17/26 Steven Brazzell arranged for Rock Hill Police Department to perform a formal security ' +
          'assessment of the entire church property. The assessment was conducted on 4/24/26 at 1 PM, ' +
          'with Daniel Huddleston and Steven walking RHPD officers through the property. ' +
          'Officers took notes and photographs. ' +
          'A formal written assessment report will be provided to the church. ' +
          'RHPD will also return to conduct a 2-hour Active Shooter Response training at a separately scheduled time. ' +
          'Written assessment report and RHPD recommendations to follow. ' +
          'This assessment is directly relevant to the NSGP grant application process.',
      },

      {
        siteId: MAIN,
        title: 'New Interior Camera Installed — Stairwell Door Coverage',
        locationDescription: 'Interior stairwell / stairwell top door area',
        observationType: 'Security Improvement',
        severity: 2,
        notes:
          'On 4/18/26 Brian Thompson installed a new interior UniFi camera to cover the stairwell door area. ' +
          'Mount angle to be improved to also capture the door at the top of the stairs. ' +
          'Represents ongoing expansion of camera coverage to address previously identified blind spots. ' +
          'Five total new high-resolution cameras acquired and being progressively installed.',
      },

      {
        siteId: MAIN,
        title: 'Fence Prongs Loose — Safety and Security Hazard',
        locationDescription: 'Exterior fence area',
        observationType: 'Physical Security / Maintenance',
        severity: 2,
        notes:
          'On 4/12/26 a team member (Aimee Leger) identified that fence prongs were loose and needed either screwing in or welding. ' +
          'Jennifer Shellenberger noted that Whit had already seen the issue the prior week and planned to fix it. ' +
          'Recommendation: Inspect and repair all fence prongs and structural fence elements; include in next scheduled work day.',
      },

      {
        siteId: MAIN,
        title: 'Overgrowth Adjacent to Main Building — Concealment Concern',
        locationDescription: 'Area adjacent to main building / former parsonage footprint',
        observationType: 'Perimeter Security',
        severity: 3,
        notes:
          'On 3/24/26 Robert Baker shared photos of significant overgrowth adjacent to the building, ' +
          'expressing concern about individuals concealing themselves and children accessing the area. ' +
          'Amber Hinson noted that concrete structures from a previously demolished parsonage remain underneath the growth ' +
          '(Jason Johnston familiar with prior clearing work). ' +
          'The city also has large pipe reels stored in the adjacent field that the church does not own. ' +
          'Steven Brazzell reached out to CJ about using an upcoming work day to address the overgrowth. ' +
          'Recommendation: Clear or thin overgrowth; remove or document city-owned equipment on adjacent property.',
      },

      {
        siteId: MAIN,
        title: 'Women\'s Bible Study — Recurring Encounters with Intoxicated/Troubled Individuals',
        locationDescription: 'CAB and main building — Tuesday evenings 6:30–8:00 PM',
        observationType: 'Event Security Gap',
        severity: 3,
        notes:
          'The Tuesday evening women\'s Bible study has experienced multiple encounters with individuals ' +
          'who appear under the influence or in a disturbed mental state approaching the building. ' +
          'As of 3/4/26 the women formally requested a safety team presence be assigned to all Tuesday evening sessions. ' +
          'McGill Hutto has been the primary safety team member assigned, and has generally sat outside in his vehicle. ' +
          'The Charles incidents (April 2026) significantly elevated the risk profile for this event. ' +
          'Additional coverage was requested for most Tuesday sessions after 4/8/26 but was hampered by team availability. ' +
          'Recommendation: Formally schedule two-person safety team coverage for all Tuesday evening Bible studies; ' +
          'implement strict door-locking protocol from start of study.',
      },

      {
        siteId: GARAGE,
        title: 'Garage Camera Reliability — Occasional Outages',
        locationDescription: 'Garage exterior camera system',
        observationType: 'Equipment Deficiency',
        severity: 2,
        notes:
          'On 3/29/26 garage cameras appeared offline to team member Ryan Smith (though team confirmed they were actually online). ' +
          'On 3/22/26 cameras were down on the monitoring TV in Carrie\'s office (required viewport restart). ' +
          'Fiber optic connection installed 12/30/25 significantly improved stability but occasional restarts are still needed. ' +
          'Recommendation: Establish a weekly camera system health check and document restart procedures for staff.',
      },

    ],
  })

  console.log(`✅  Created ${obs.count} additional site observations`)

  // ─── EXISTING SECURITY MEASURES (ADDENDUM) ───────────────────────────────

  const measures = await prisma.existingSecurityMeasure.createMany({
    data: [

      {
        siteId: MAIN,
        category: 'Law Enforcement Coordination',
        description:
          'Active relationship established with Rock Hill Police Department for church security. ' +
          'RHPD conducted a formal written security assessment of all church buildings and grounds on 4/24/26. ' +
          'RHPD will conduct a 2-hour Active Shooter Response training for the safety team at a scheduled future date. ' +
          'Trespass notices coordinated through RHPD (Joshua David Taft, trespass 9/22/25, valid 1 year). ' +
          'RHPD non-emergency line used for incident response on multiple occasions. ' +
          'Officer Nathan Anderson (RHPD, former safety team member) provided ongoing intelligence and coordination assistance.',
        effectivenessRating: 3,
        gapsRemaining:
          'RHPD assessment report and recommendations not yet received/implemented as of chat history end. ' +
          'Active Shooter training not yet scheduled. ' +
          'No paid/off-duty officer presence during regular services. ' +
          'Trespass notices are only valid 1 year per RHPD policy, requiring renewal.',
        notes:
          'SAM.gov Unique Entity Identifier (UEI: UN56ENDA7GD3) registered 3/1/26, enabling federal grant applications. ' +
          'NSGP grant application process initiated; working with SLED (SC State Administrative Agency). ' +
          'SLED also offers free Active Shooter / CCTA training for churches and businesses.',
      },

      {
        siteId: MAIN,
        category: 'Personnel — Background Checks and Vetting',
        description:
          'Formal background check process initiated for all safety team members (1/15/26). ' +
          'Jennifer Shellenberger administers background checks using children\'s ministry software. ' +
          'Background check run for Aimee Leger upon joining (1/15/26). ' +
          'Justin Talkington scheduled for background check. ' +
          'Daniel Huddleston\'s check to be rerun (last done 2018). ' +
          'Policy: background checks to be rerun every 4 years.',
        effectivenessRating: 3,
        gapsRemaining:
          'Backfill checks for existing team members not all completed as of chat history. ' +
          'No formal written policy for carry authorization revocation if background check reveals disqualifying information.',
        notes:
          'Process modeled on existing children\'s ministry background check protocol. ' +
          'Carry authorization list maintained and updated by team leader.',
      },

    ],
  })

  console.log(`✅  Created ${measures.count} additional security measures`)

  // ─── UPDATE EXISTING THREAT: Joshua Taft — add 2026 escalation note ──────
  // We already have a Taft entry; add a separate 2026-specific entry above.
  // No update to existing record needed since we created a separate 2026 entry.

  console.log('\n🎉  2026 addendum seeding complete!')
  console.log('\n📋  GRAND TOTALS:')

  const [tc, oc, mc] = await Promise.all([
    prisma.threatAssessment.count({ where: { siteId: { in: [MAIN, CAB, GARAGE] } } }),
    prisma.siteObservation.count({ where: { siteId: { in: [MAIN, CAB, GARAGE] } } }),
    prisma.existingSecurityMeasure.count({ where: { siteId: { in: [MAIN, CAB, GARAGE] } } }),
  ])
  console.log(`   Threat Assessments:       ${tc}`)
  console.log(`   Site Observations:         ${oc}`)
  console.log(`   Existing Security Measures: ${mc}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
