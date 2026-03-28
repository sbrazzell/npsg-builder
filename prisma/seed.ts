import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import 'dotenv/config'

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Clean up existing data
  await prisma.projectThreatLink.deleteMany()
  await prisma.budgetItem.deleteMany()
  await prisma.projectProposal.deleteMany()
  await prisma.existingSecurityMeasure.deleteMany()
  await prisma.threatAssessment.deleteMany()
  await prisma.siteObservation.deleteMany()
  await prisma.narrativeDraft.deleteMany()
  await prisma.applicationPacket.deleteMany()
  await prisma.facility.deleteMany()
  await prisma.organization.deleteMany()

  // Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Grace Community Church',
      denomination: 'Non-denominational Protestant',
      address: '4200 North Lincoln Avenue',
      city: 'Chicago',
      state: 'IL',
      zip: '60618',
      contactName: 'Pastor James Whitfield',
      contactEmail: 'pastor@gracecommunitychurch.org',
      contactPhone: '(773) 555-0142',
      einOrTaxId: '36-4821047',
      notes: 'Grace Community Church is a 501(c)(3) congregation founded in 1987, serving the North Center neighborhood. The church operates a licensed daycare center and an after-school tutoring program in addition to weekly worship services.',
    },
  })

  console.log('Created organization:', org.name)

  // Create Facility
  const facility = await prisma.facility.create({
    data: {
      organizationId: org.id,
      facilityName: 'Grace Community Church — Main Campus',
      address: '4200 North Lincoln Avenue, Chicago, IL 60618',
      occupancyNotes: 'Peak occupancy on Sunday mornings (approx. 450 attendees across two services). The daycare center operates Monday–Friday with up to 60 children enrolled. The after-school program serves 35 students on weekday afternoons.',
      populationServed: 'Approximately 450 weekly worship attendees including families with children; 60 enrolled daycare children (ages 0–5); 35 after-school students (ages 6–12); weekly food pantry serving 120+ community members',
      daysHoursOfOperation: 'Sunday: 8:00 AM – 1:00 PM (services); Monday–Friday: 7:00 AM – 6:00 PM (daycare); Monday–Thursday: 3:00 PM – 6:00 PM (after-school program); Friday: 9:00 AM – 12:00 PM (food pantry)',
      childrensAreasNotes: 'The daycare center occupies the entire east wing of the building (Rooms 101–112). The after-school program uses the fellowship hall and two classrooms. Both areas have single-point entry from the main lobby but no dedicated secure check-in system. Children\'s area doors are equipped with standard residential-grade locks. There is no camera coverage in the hallways leading to children\'s areas.',
      parkingLotNotes: 'The facility has a 45-space surface parking lot accessible from North Lincoln Avenue. The lot has no physical barriers preventing vehicle access directly to the building perimeter. Three of the four existing lot lights have burned out and have not been replaced due to budget constraints. The lot is frequented by non-congregation members as a cut-through pedestrian path, particularly at night.',
      surroundingAreaNotes: 'The church is located adjacent to a 24-hour convenience store on the southeast corner, which has been a source of recurring issues including loitering, public intoxication, and two reported assaults in the past 18 months. A CTA bus stop directly in front of the property increases foot traffic from unrelated community members. The neighborhood has seen a 22% increase in property crime over the past three years according to Chicago PD data.',
      publicAccessNotes: 'The main building entrance is unlocked during all operating hours with no staffed reception desk. Visitors can freely access interior hallways, restrooms, and stairwells without interception. Side doors in the children\'s wing open directly from classrooms to an exterior play area, creating an unsecured egress point that is not monitored.',
      knownSecurityConcerns: 'Unlocked side doors in the children\'s wing; inadequate exterior lighting in the parking lot and building perimeter; pedestrian cut-through traffic from adjacent convenience store; no visitor screening or check-in process; two prior incidents of vandalism to vehicles in the parking lot in 2023; one incident of an unauthorized individual accessing the daycare hallway before being intercepted by staff in early 2024',
      notes: 'The church board approved a security improvement initiative in early 2024 following the daycare hallway incident. The NSGP application is the primary funding mechanism for the proposed improvements.',
    },
  })

  console.log('Created facility:', facility.facilityName)

  // Create Threat Assessments
  const threat1 = await prisma.threatAssessment.create({
    data: {
      facilityId: facility.id,
      threatType: 'Unauthorized Entry / Intrusion',
      description: 'An unauthorized individual gains access to restricted areas of the facility, particularly the children\'s daycare and after-school program areas.',
      likelihood: 4,
      impact: 5,
      vulnerabilityNotes: 'The facility currently has no controlled access to the children\'s wing. Main building doors are unlocked during all operating hours. Side doors in the daycare area open directly to the exterior without camera coverage or alarm contact. A prior incident in early 2024 confirmed this vulnerability when an intoxicated individual from the adjacent convenience store entered the daycare hallway before being intercepted.',
      incidentHistory: 'In February 2024, an intoxicated adult male entered the east wing hallway adjacent to Rooms 104–106 during afternoon daycare hours. The individual was intercepted by a teacher\'s aide before reaching any occupied classroom. Chicago PD responded but no charges were filed. Incident was reported to the church board and prompted this security assessment.',
    },
  })

  const threat2 = await prisma.threatAssessment.create({
    data: {
      facilityId: facility.id,
      threatType: 'Targeted Violence / Hate Crime',
      description: 'An individual or group targets the congregation due to religious affiliation, motivated by hate or extremist ideology.',
      likelihood: 3,
      impact: 5,
      vulnerabilityNotes: 'The facility has no hardened perimeter, no vehicle barriers, and no panic alert system. A soft target with predictable gathering patterns (Sunday services) and high occupancy. No security personnel are present during services. Adjacent vehicle access from the parking lot directly to the building entry would allow a vehicle-ramming attack with no impediment.',
      incidentHistory: 'No direct incident history at this location. However, the congregation is aware of two attacks on religious institutions in the greater Chicago area in the past four years, including one on a church of similar denomination in a neighboring suburb in 2022. FBI threat advisories for houses of worship have been reviewed by church leadership.',
    },
  })

  const threat3 = await prisma.threatAssessment.create({
    data: {
      facilityId: facility.id,
      threatType: 'Vandalism / Property Damage',
      description: 'Graffiti, broken windows, or damage to vehicles and property, particularly in the unmonitored parking lot.',
      likelihood: 5,
      impact: 2,
      vulnerabilityNotes: 'The parking lot has minimal lighting and no camera coverage. The convenience store adjacent to the property has been associated with loitering and disruptive behavior. Three of four parking lot lights are non-functional.',
      incidentHistory: 'Two incidents of vehicle vandalism in 2023: (1) July 2023 — three vehicles had windows smashed overnight; (2) November 2023 — graffiti applied to the east exterior wall of the building. Damage in the July incident totaled approximately $2,400 to congregation members\' vehicles. Police reports filed but no suspects identified.',
    },
  })

  const threat4 = await prisma.threatAssessment.create({
    data: {
      facilityId: facility.id,
      threatType: 'Active Shooter / Armed Assault',
      description: 'An armed attacker enters the facility with the intent to cause mass casualties, particularly during high-occupancy worship services.',
      likelihood: 2,
      impact: 5,
      vulnerabilityNotes: 'No screening at entry points. No lockdown procedure in place. No panic button or silent alarm system. High occupancy on Sunday mornings creates a high-consequence scenario. Sanctuary has limited secondary exits.',
      incidentHistory: 'No direct incident history. Church has reviewed CISA guidance for houses of worship and identified significant gaps in preparedness.',
    },
  })

  const threat5 = await prisma.threatAssessment.create({
    data: {
      facilityId: facility.id,
      threatType: 'Harassment / Stalking',
      description: 'Congregation members, particularly domestic violence survivors attending support groups hosted at the facility, are followed or confronted on-site.',
      likelihood: 3,
      impact: 3,
      vulnerabilityNotes: 'The facility hosts a weekly domestic violence support group. Participants have raised safety concerns about being followed from the facility. There is no private or secured entrance for this program.',
      incidentHistory: 'One incident in 2023 where a participant in the DV support group was approached in the parking lot by an individual she believed to be her abuser. Police were called. The incident prompted the group\'s facilitator to request improved security measures.',
    },
  })

  console.log('Created threat assessments')

  // Create Existing Security Measures
  await prisma.existingSecurityMeasure.create({
    data: {
      facilityId: facility.id,
      category: 'Video Surveillance (CCTV)',
      description: 'Four analog CCTV cameras installed in 2014: two covering the main entrance/lobby, one in the fellowship hall, one in the parking lot. Footage recorded to a DVR on a 7-day loop.',
      effectivenessRating: 2,
      gapsRemaining: 'Cameras are 10+ years old and provide low-resolution footage (480p), making identification difficult. No camera coverage in the children\'s wing hallways, east side exit doors, or the north and west portions of the parking lot. Camera positioned in parking lot covers only approximately 30% of the lot due to angle.',
      notes: 'DVR unit has failed twice in the past year. IT volunteer has repaired it but replacement parts are increasingly unavailable.',
    },
  })

  await prisma.existingSecurityMeasure.create({
    data: {
      facilityId: facility.id,
      category: 'Access Control',
      description: 'Standard keyed deadbolt locks on all exterior doors. Main entrance uses a push-bar crash bar with exterior key access after hours.',
      effectivenessRating: 2,
      gapsRemaining: 'No electronic access control on any door. No ability to audit who has entered or when. Keys have been distributed broadly and no key audit has been conducted since 2019. Side doors in the children\'s wing have no automatic-close mechanism and are frequently propped open by staff for convenience.',
      notes: 'Facility manager has noted that re-keying all locks is needed but has been deferred due to cost.',
    },
  })

  await prisma.existingSecurityMeasure.create({
    data: {
      facilityId: facility.id,
      category: 'Staffing / Personnel',
      description: 'A volunteer greeter stands at the main entrance during Sunday worship services. No security personnel during weekday programming. Daycare staff are required to perform ID check on child pickup.',
      effectivenessRating: 2,
      gapsRemaining: 'Volunteer greeters have no formal security training and no protocol for confronting or redirecting unknown individuals. Greeter position is only staffed on Sunday mornings. No personnel at entrance during weekday daycare or after-school hours.',
      notes: 'The senior pastor has expressed interest in establishing a formal volunteer security team, but training resources have not been identified.',
    },
  })

  await prisma.existingSecurityMeasure.create({
    data: {
      facilityId: facility.id,
      category: 'Lighting',
      description: 'Interior lighting is adequate throughout the building. Exterior lighting consists of four pole-mounted fixtures in the parking lot and two wall sconces at the main entrance.',
      effectivenessRating: 1,
      gapsRemaining: 'Three of four parking lot light fixtures are non-functional due to burned-out bulbs or ballast failures. The replacement budget has been deferred for two budget cycles. East side of the building (children\'s wing exterior) has no dedicated lighting. Building perimeter is dark on three sides after sunset.',
      notes: 'This is the highest-priority lighting issue per the facility manager.',
    },
  })

  console.log('Created security measures')

  // Create Project Proposals
  const project1 = await prisma.projectProposal.create({
    data: {
      facilityId: facility.id,
      title: 'Perimeter Security: Lighting & Vehicle Barriers',
      category: 'Physical Barriers / Perimeter',
      problemStatement: 'The facility\'s parking lot and building perimeter are inadequately lit, creating conditions that enable vandalism, loitering, and unseen approaches to the building. The parking lot also lacks any vehicle control measures, leaving the main building entrance exposed to a potential vehicle-ramming attack.',
      proposedSolution: 'Installation of (8) new LED parking lot light fixtures to replace non-functional units and extend coverage to the north and west parking areas; installation of (4) LED wall-mounted security fixtures on building perimeter; installation of (3) concrete security bollards at the main entrance vehicle approach lane.',
      riskReductionRationale: 'Adequate exterior lighting is documented in security literature as one of the most cost-effective deterrents to criminal activity and unauthorized approach. Restoring and expanding lighting addresses the conditions that enabled two prior vandalism incidents and reduces undetected approach risk for all threat categories. Bollards at the main entrance eliminate the vehicle-ramming attack vector identified in the threat assessment.',
      implementationNotes: 'LED fixtures can be installed by a licensed electrical contractor within a 2-week window. Bollard installation requires a concrete sub-contractor and sidewalk permit from the City of Chicago. Church has an existing relationship with Midway Electrical Services for this work.',
      priority: 1,
      status: 'draft',
      notes: 'This project has the highest priority as it addresses both the most likely and most impactful threats while also improving conditions for the remaining project implementations.',
    },
  })

  const project2 = await prisma.projectProposal.create({
    data: {
      facilityId: facility.id,
      title: 'CCTV Expansion & Upgrade',
      category: 'Video Surveillance (CCTV)',
      problemStatement: 'The existing 4-camera analog CCTV system from 2014 provides insufficient coverage of the facility and produces low-resolution footage inadequate for identification purposes. The children\'s wing — the highest-risk area of the facility — has no camera coverage whatsoever.',
      proposedSolution: 'Installation of a 16-channel IP security camera system with (12) new cameras providing full coverage of the children\'s wing hallways, all exterior exit doors, parking lot, and building perimeter. New NVR with 30-day storage capacity. Remote monitoring capability via mobile app for facility administrator.',
      riskReductionRationale: 'Comprehensive camera coverage of the children\'s wing directly addresses the February 2024 unauthorized entry incident by providing real-time detection of unauthorized individuals in restricted areas. Camera coverage of parking lot and exterior perimeter deters vandalism and provides evidentiary value in future incidents. IP cameras with high-definition resolution ensure usable footage for law enforcement investigations.',
      implementationNotes: 'Hikvision or Axis IP camera systems recommended by our security consultant. Installation estimated at 3–4 days by a licensed low-voltage contractor. Existing DVR infrastructure will be replaced; new NVR will be mounted in the main office server closet.',
      priority: 2,
      status: 'draft',
    },
  })

  const project3 = await prisma.projectProposal.create({
    data: {
      facilityId: facility.id,
      title: 'Controlled Access: Children\'s Wing & Main Entrance',
      category: 'Access Control Systems',
      problemStatement: 'The children\'s wing of the facility — where 60 enrolled daycare children and 35 after-school students spend time each weekday — is accessible to anyone who enters the main building. There is no controlled access point between the public lobby and the children\'s areas, enabling the unauthorized entry incident of February 2024.',
      proposedSolution: 'Installation of a card-reader electronic access control system on the door separating the main lobby from the children\'s wing corridor, with video intercom and electric strike. Installation of door contact alarms on the exterior side doors of the children\'s wing with automatic door-close mechanisms. Installation of a panic button system in the daycare director\'s office connected to both an audible alarm and a silent alert to designated staff mobile devices.',
      riskReductionRationale: 'Controlled access to the children\'s wing creates a physical barrier between the public areas and areas where children are present, directly mitigating the vulnerability exploited in the February 2024 incident. Card-based access creates an audit trail of entries. Door contact alarms on propped or opened exterior doors create immediate alert conditions. Panic button system enables rapid lockdown response and law enforcement notification without staff needing to reach a phone.',
      implementationNotes: 'Brivo or Doorbird video intercom/access systems recommended. Work to be sequenced after CCTV project to allow integration of camera feeds with access control events.',
      priority: 3,
      status: 'draft',
    },
  })

  console.log('Created project proposals')

  // Create Budget Items for Project 1
  const budgetItems1 = [
    { itemName: 'LED Parking Lot Light Fixture (250W)', category: 'Equipment', quantity: 8, unitCost: 485, justification: 'Replaces 3 non-functional fixtures and adds 5 new fixtures for full lot coverage', vendorName: 'Lumen Systems LLC' },
    { itemName: 'LED Wall-Mount Security Fixture', category: 'Equipment', quantity: 4, unitCost: 195, justification: 'Perimeter lighting for east, north, and west building faces', vendorName: 'Lumen Systems LLC' },
    { itemName: 'Concrete Security Bollard (removable, 8-inch)', category: 'Equipment', quantity: 3, unitCost: 1200, justification: 'Vehicle anti-ram protection at main entrance approach', vendorName: 'Delta Scientific (via local distributor)' },
    { itemName: 'Electrical Installation Labor', category: 'Installation / Labor', quantity: 1, unitCost: 4200, justification: 'Licensed electrical contractor (Midway Electrical Services) for all fixture installation', vendorName: 'Midway Electrical Services' },
    { itemName: 'Bollard Installation & Concrete Work', category: 'Installation / Labor', quantity: 1, unitCost: 3500, justification: 'Concrete sub-contractor for bollard footings and sidewalk patching', vendorName: 'Chicago Concrete Contractors' },
    { itemName: 'City of Chicago Sidewalk/Permit Fees', category: 'Other', quantity: 1, unitCost: 650, justification: 'Required permit for bollard installation adjacent to public sidewalk' },
  ]

  for (const item of budgetItems1) {
    await prisma.budgetItem.create({
      data: {
        projectId: project1.id,
        itemName: item.itemName,
        category: item.category,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost,
        justification: item.justification,
        vendorName: item.vendorName,
      },
    })
  }

  // Create Budget Items for Project 2
  const budgetItems2 = [
    { itemName: 'IP Security Camera (4K Dome, Indoor)', category: 'Equipment', quantity: 6, unitCost: 290, justification: "Children's wing hallways and interior corridor coverage" },
    { itemName: 'IP Security Camera (4K Bullet, Outdoor)', category: 'Equipment', quantity: 6, unitCost: 345, justification: 'Exterior doors, parking lot, and building perimeter' },
    { itemName: '16-Channel NVR with 4TB Storage', category: 'Equipment', quantity: 1, unitCost: 1850, justification: '30-day video retention, remote access capability' },
    { itemName: 'Cat6 Network Cable (1000ft spool)', category: 'Infrastructure', quantity: 2, unitCost: 180, justification: 'PoE cabling for all camera runs' },
    { itemName: 'Low-Voltage Installation Labor', category: 'Installation / Labor', quantity: 1, unitCost: 5500, justification: 'Licensed low-voltage contractor for all camera and NVR installation, programming, and testing' },
    { itemName: 'Camera Mounting Hardware & Conduit', category: 'Infrastructure', quantity: 1, unitCost: 620, justification: 'Mounting brackets, conduit, junction boxes for all 12 cameras' },
  ]

  for (const item of budgetItems2) {
    await prisma.budgetItem.create({
      data: {
        projectId: project2.id,
        itemName: item.itemName,
        category: item.category,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost,
        justification: item.justification,
        vendorName: (item as { vendorName?: string }).vendorName,
      },
    })
  }

  // Create Budget Items for Project 3
  const budgetItems3 = [
    { itemName: 'Electronic Access Control Door Kit (card reader, electric strike, controller)', category: 'Equipment', quantity: 1, unitCost: 2800, justification: "Children's wing lobby entry point — primary controlled access barrier" },
    { itemName: 'Video Intercom Station (wall-mount, color display)', category: 'Equipment', quantity: 1, unitCost: 750, justification: 'Allows staff to visually verify visitors before granting access' },
    { itemName: 'Door Contact Alarm with Magnetic Holder', category: 'Equipment', quantity: 4, unitCost: 185, justification: "Exterior side doors in children's wing — alerts when door is opened" },
    { itemName: 'Automatic Door Closer (ADA-compliant)', category: 'Equipment', quantity: 4, unitCost: 210, justification: "Ensures children's wing side doors automatically close and latch" },
    { itemName: 'Panic Button Station (hardwired)', category: 'Equipment', quantity: 2, unitCost: 320, justification: 'Daycare director office and after-school program coordinator office' },
    { itemName: 'Access Control Software License (3-year)', category: 'Software / Licensing', quantity: 1, unitCost: 895, justification: 'Cloud-based access management, audit logs, and credential management' },
    { itemName: 'Installation Labor (access control & intercom)', category: 'Installation / Labor', quantity: 1, unitCost: 4200, justification: 'Licensed low-voltage and electrical contractor for full system installation and programming' },
  ]

  for (const item of budgetItems3) {
    await prisma.budgetItem.create({
      data: {
        projectId: project3.id,
        itemName: item.itemName,
        category: item.category,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost,
        justification: item.justification,
      },
    })
  }

  console.log('Created budget items')

  // Link threats to projects
  // Project 1 (lighting/barriers) links to vandalism, targeted violence, unauthorized entry
  await prisma.projectThreatLink.create({ data: { projectId: project1.id, threatId: threat1.id } })
  await prisma.projectThreatLink.create({ data: { projectId: project1.id, threatId: threat2.id } })
  await prisma.projectThreatLink.create({ data: { projectId: project1.id, threatId: threat3.id } })

  // Project 2 (CCTV) links to unauthorized entry, vandalism, harassment
  await prisma.projectThreatLink.create({ data: { projectId: project2.id, threatId: threat1.id } })
  await prisma.projectThreatLink.create({ data: { projectId: project2.id, threatId: threat3.id } })
  await prisma.projectThreatLink.create({ data: { projectId: project2.id, threatId: threat5.id } })

  // Project 3 (access control) links to unauthorized entry, harassment, active shooter
  await prisma.projectThreatLink.create({ data: { projectId: project3.id, threatId: threat1.id } })
  await prisma.projectThreatLink.create({ data: { projectId: project3.id, threatId: threat4.id } })
  await prisma.projectThreatLink.create({ data: { projectId: project3.id, threatId: threat5.id } })

  console.log('Created threat-project links')

  // Create Site Observations
  await prisma.siteObservation.create({
    data: {
      facilityId: facility.id,
      title: 'Three parking lot lights non-functional',
      locationDescription: 'North and northwest parking lot area',
      observationType: 'Lighting Deficiency',
      severity: 4,
      notes: 'Three of four parking lot light fixtures have failed. The remaining functional fixture provides minimal coverage of the southern-most portion of the lot. The north and northwest areas where most vehicles park on Sunday mornings are completely unlit after sunset. Observed multiple dark areas that would conceal persons at night.',
    },
  })

  await prisma.siteObservation.create({
    data: {
      facilityId: facility.id,
      title: 'Daycare wing side door found propped open',
      locationDescription: 'East exterior side door, adjacent to Classroom 108',
      observationType: 'Access Control Gap',
      severity: 5,
      notes: 'During site visit at 3:45 PM on a Tuesday, the east side door of the daycare wing was found propped open with a doorstop. Door leads directly from an exterior alley to the hallway between Rooms 107 and 108. No staff were in the hallway. This door has no camera coverage and no alarm contact. This represents the same access vector used in the February 2024 incident.',
    },
  })

  await prisma.siteObservation.create({
    data: {
      facilityId: facility.id,
      title: 'No barrier between lobby and children\'s wing',
      locationDescription: 'Main lobby / east wing junction',
      observationType: 'Access Control Gap',
      severity: 5,
      notes: 'The transition from the main public lobby to the children\'s wing corridor is marked only by a sign. There is no door, gate, or access control point. An individual who enters the main building can proceed directly into the children\'s wing hallway without encountering any staff or physical barrier.',
    },
  })

  await prisma.siteObservation.create({
    data: {
      facilityId: facility.id,
      title: 'Convenience store loitering visible from parking lot',
      locationDescription: 'Southeast corner of parking lot, adjacent to convenience store',
      observationType: 'Behavioral Concern',
      severity: 3,
      notes: 'During site visit, three individuals were observed loitering at the southeast corner of the parking lot adjacent to the convenience store. Two of the individuals were observed passing what appeared to be a beverage container between them. This location is directly adjacent to the church parking lot and is unlit. The cut-through pedestrian path from Lincoln Ave. to the alley passes through this area.',
    },
  })

  console.log('Created site observations')

  // Create Narrative Drafts
  await prisma.narrativeDraft.create({
    data: {
      facilityId: facility.id,
      sectionName: 'executive_summary',
      versionNumber: 1,
      generatedText: `Grace Community Church respectfully submits this application for Nonprofit Security Grant Program funding to support critical security improvements at its main campus located at 4200 North Lincoln Avenue, Chicago, Illinois. The church is a 501(c)(3) non-denominational Protestant congregation that has served the North Center neighborhood since 1987.\n\nThe facility serves approximately 450 weekly worship attendees, 60 enrolled daycare children, 35 after-school program students, and over 120 food pantry recipients each week — representing a broad cross-section of vulnerable community members who depend on this facility for essential religious, educational, and social services.\n\nThis application encompasses three security projects totaling $38,375 in requested funding. The proposed improvements — perimeter lighting and vehicle barriers, CCTV expansion, and controlled access for the children's wing — address documented vulnerabilities that culminated in an unauthorized entry incident in February 2024. These investments will meaningfully reduce the risk of targeted violence, unauthorized access, and other security incidents, allowing Grace Community Church to fulfill its mission with confidence in the safety of those it serves.`,
      editedText: `Grace Community Church respectfully submits this application for Nonprofit Security Grant Program funding to support critical security improvements at its main campus located at 4200 North Lincoln Avenue, Chicago, Illinois. The church is a 501(c)(3) non-denominational Protestant congregation that has served the North Center neighborhood since 1987.\n\nThe facility serves approximately 450 weekly worship attendees, 60 enrolled daycare children, 35 after-school program students, and over 120 food pantry recipients each week — representing a broad cross-section of vulnerable community members who depend on this facility for essential religious, educational, and social services.\n\nThis application encompasses three security projects totaling $38,375 in requested funding. The proposed improvements — perimeter lighting and vehicle barriers, CCTV expansion, and controlled access for the children's wing — address documented vulnerabilities that culminated in an unauthorized entry incident in February 2024. These investments will meaningfully reduce the risk of targeted violence, unauthorized access, and other security incidents, allowing Grace Community Church to fulfill its mission with confidence in the safety of those it serves.`,
    },
  })

  await prisma.narrativeDraft.create({
    data: {
      facilityId: facility.id,
      sectionName: 'threat_overview',
      versionNumber: 1,
      generatedText: `Grace Community Church — Main Campus faces a documented range of security threats that present meaningful risk to the congregation, staff, and the children enrolled in its care programs. The facility has conducted a formal threat assessment identifying five threat categories: Unauthorized Entry/Intrusion, Targeted Violence/Hate Crime, Vandalism/Property Damage, Active Shooter/Armed Assault, and Harassment/Stalking.\n\nOf particular concern are three threats rated at high or critical risk levels: unauthorized entry (Likelihood 4, Impact 5, Score 20 — Critical), targeted violence (Likelihood 3, Impact 5, Score 15 — High), and active shooter scenarios (Likelihood 2, Impact 5, Score 10 — High). These threat ratings reflect both the specific conditions at this facility and the broader threat environment facing houses of worship nationwide.\n\nThe facility is situated adjacent to a 24-hour convenience store that has been the site of recurring public intoxication incidents and two assaults in the past 18 months, contributing directly to the unauthorized entry incident documented in February 2024. The surrounding neighborhood has experienced a 22% increase in property crime over the past three years, and the facility's open-access design and limited security infrastructure create conditions that invite rather than deter hostile actors.`,
      editedText: `Grace Community Church — Main Campus faces a documented range of security threats that present meaningful risk to the congregation, staff, and the children enrolled in its care programs. The facility has conducted a formal threat assessment identifying five threat categories: Unauthorized Entry/Intrusion, Targeted Violence/Hate Crime, Vandalism/Property Damage, Active Shooter/Armed Assault, and Harassment/Stalking.\n\nOf particular concern are three threats rated at high or critical risk levels: unauthorized entry (Likelihood 4, Impact 5, Score 20 — Critical), targeted violence (Likelihood 3, Impact 5, Score 15 — High), and active shooter scenarios (Likelihood 2, Impact 5, Score 10 — High). These threat ratings reflect both the specific conditions at this facility and the broader threat environment facing houses of worship nationwide.\n\nThe facility is situated adjacent to a 24-hour convenience store that has been the site of recurring public intoxication incidents and two assaults in the past 18 months, contributing directly to the unauthorized entry incident documented in February 2024. The surrounding neighborhood has experienced a 22% increase in property crime over the past three years, and the facility's open-access design and limited security infrastructure create conditions that invite rather than deter hostile actors.`,
    },
  })

  console.log('Created narrative drafts')

  // Create Application Packet
  await prisma.applicationPacket.create({
    data: {
      facilityId: facility.id,
      title: 'FY2025 NSGP Application — Grace Community Church',
      summary: 'Three-project security improvement request totaling $38,375, addressing unauthorized entry, CCTV coverage gaps, and perimeter lighting deficiencies.',
      status: 'draft',
    },
  })

  console.log('Created application packet')

  console.log('\nSeed complete!')
  console.log('Organization: Grace Community Church')
  console.log('Facility: Grace Community Church — Main Campus')
  console.log('Threats: 5 | Measures: 4 | Projects: 3 | Observations: 4 | Narratives: 2')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
