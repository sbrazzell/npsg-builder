export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { GuideSteps, GuideStep, StepStatus } from './guide-steps'
import { BookOpen, CheckCircle2 } from 'lucide-react'

// ─── fetch real progress ─────────────────────────────────────────────────────

async function getProgress() {
  const [orgs, facilities, threats, measures, projects, budgetItems, narratives] =
    await Promise.all([
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          einOrTaxId: true,
          contactName: true,
          contactEmail: true,
          address: true,
          facilities: { select: { id: true } },
        },
      }),
      prisma.facility.findMany({
        include: {
          threatAssessments:  { select: { id: true } },
          securityMeasures:   { select: { id: true } },
          projectProposals:   {
            include: {
              budgetItems:  { select: { id: true, justification: true, totalCost: true } },
              threatLinks:  { select: { id: true } },
            },
          },
          narrativeDrafts:    { select: { id: true, editedText: true, generatedText: true } },
        },
      }),
      prisma.threatAssessment.count(),
      prisma.existingSecurityMeasure.count(),
      prisma.projectProposal.findMany({
        include: {
          budgetItems: { select: { id: true } },
          threatLinks: { select: { id: true } },
        },
      }),
      prisma.budgetItem.findMany({ select: { id: true, justification: true, totalCost: true } }),
      prisma.narrativeDraft.findMany({ select: { id: true, editedText: true, generatedText: true } }),
    ])

  const facilityCount    = facilities.length
  const orgCount         = orgs.length
  const threatCount      = threats
  const measureCount     = measures
  const projectCount     = projects.length
  const budgetItemCount  = budgetItems.length
  const narrativeCount   = narratives.filter(n => n.editedText || n.generatedText).length

  // Step 1: Org exists + has EIN + has contact
  const orgsComplete    = orgs.filter(o => o.einOrTaxId && o.contactName && o.address)
  const step1Done       = orgCount > 0
  const step1Blocker    = orgCount > 0 && orgsComplete.length < orgCount
    ? `${orgCount - orgsComplete.length} organization${orgCount - orgsComplete.length > 1 ? 's are' : ' is'} missing EIN, contact name, or address.`
    : undefined

  // Step 2: At least one facility
  const step2Done = facilityCount > 0

  // Step 3: Every facility has at least one threat
  const facilitiesWithThreats  = facilities.filter(f => f.threatAssessments.length > 0).length
  const step3Done              = facilityCount > 0 && facilitiesWithThreats === facilityCount
  const step3Blocker           = facilityCount > 0 && facilitiesWithThreats < facilityCount
    ? `${facilityCount - facilitiesWithThreats} ${facilityCount - facilitiesWithThreats === 1 ? 'facility has' : 'facilities have'} no threat assessments.`
    : undefined

  // Step 4: Every facility has at least one security measure
  const facilitiesWithMeasures = facilities.filter(f => f.securityMeasures.length > 0).length
  const step4Done              = facilityCount > 0 && facilitiesWithMeasures === facilityCount
  const step4Blocker           = facilityCount > 0 && facilitiesWithMeasures < facilityCount
    ? `${facilityCount - facilitiesWithMeasures} ${facilityCount - facilitiesWithMeasures === 1 ? 'facility is' : 'facilities are'} missing security measure documentation.`
    : undefined

  // Step 5: Every facility has ≥1 project, every project is linked to a threat
  const facilitiesWithProjects = facilities.filter(f => f.projectProposals.length > 0).length
  const projectsWithoutLinks   = projects.filter(p => p.threatLinks.length === 0)
  const step5Done              = facilityCount > 0 && facilitiesWithProjects === facilityCount && projectsWithoutLinks.length === 0
  const step5Blocker           = facilityCount > 0 && (facilitiesWithProjects < facilityCount || projectsWithoutLinks.length > 0)
    ? [
        facilitiesWithProjects < facilityCount
          ? `${facilityCount - facilitiesWithProjects} ${facilityCount - facilitiesWithProjects === 1 ? 'facility needs' : 'facilities need'} at least one project proposal.`
          : null,
        projectsWithoutLinks.length > 0
          ? `${projectsWithoutLinks.length} ${projectsWithoutLinks.length === 1 ? 'project is' : 'projects are'} not linked to any documented threat.`
          : null,
      ].filter(Boolean).join(' ')
    : undefined

  // Step 6: Every project has ≥1 budget item with justification
  const projectsWithBudgets   = projects.filter(p => p.budgetItems.length > 0).length
  const unjustifiedItems       = budgetItems.filter(b => !b.justification && b.totalCost > 0)
  const step6Done              = projectCount > 0 && projectsWithBudgets === projectCount && unjustifiedItems.length === 0
  const step6Blocker           = projectCount > 0 && (projectsWithBudgets < projectCount || unjustifiedItems.length > 0)
    ? [
        projectsWithBudgets < projectCount
          ? `${projectCount - projectsWithBudgets} ${projectCount - projectsWithBudgets === 1 ? 'project needs' : 'projects need'} budget items.`
          : null,
        unjustifiedItems.length > 0
          ? `${unjustifiedItems.length} budget ${unjustifiedItems.length === 1 ? 'item is' : 'items are'} missing justification text.`
          : null,
      ].filter(Boolean).join(' ')
    : undefined

  // Step 7: Every facility has at least one narrative draft
  const facilitiesWithNarratives = facilities.filter(f => f.narrativeDrafts.some(n => n.editedText || n.generatedText)).length
  const step7Done                = facilityCount > 0 && facilitiesWithNarratives === facilityCount
  const step7Blocker             = facilityCount > 0 && facilitiesWithNarratives < facilityCount
    ? `${facilityCount - facilitiesWithNarratives} ${facilityCount - facilitiesWithNarratives === 1 ? 'facility has' : 'facilities have'} no drafted narratives.`
    : undefined

  // Step 8: always actionable
  const step8Done = false

  // Determine "active" step: first incomplete one
  const statuses = [step1Done, step2Done, step3Done, step4Done, step5Done, step6Done, step7Done]
  const firstIncomplete = statuses.findIndex(s => !s) + 1   // 1-based
  const activeStep = firstIncomplete === 0 ? 8 : firstIncomplete

  function s(n: number, done: boolean): StepStatus {
    if (done) return 'done'
    if (n === activeStep) return 'active'
    return 'upcoming'
  }

  const steps: GuideStep[] = [
    {
      number: 1,
      title: 'Create your organization',
      eyebrow: 'The nonprofit entity applying for the grant',
      description:
        'Start by adding the nonprofit organization that will be named on the grant application. You\'ll need the legal name, EIN (Employer Identification Number), primary contact, and mailing address. If you manage multiple organizations, add each one separately.',
      why: 'FEMA uses the organization record to verify eligibility, match your EIN to IRS records, and route award funds. An incomplete organization profile is one of the most common reasons applications are returned.',
      tips: [
        'Your EIN must match exactly what\'s on file with the IRS.',
        'The contact person should be authorized to sign grant agreements.',
        'You can manage multiple organizations — each gets its own set of facilities.',
      ],
      status: s(1, step1Done),
      count: orgCount > 0 ? `${orgCount} added` : undefined,
      blocker: step1Blocker,
      cta: { label: orgCount > 0 ? 'Manage organizations' : 'Add your first organization', href: orgCount > 0 ? '/organizations' : '/organizations/new' },
    },
    {
      number: 2,
      title: 'Add your facilities',
      eyebrow: 'Physical locations seeking security improvements',
      description:
        'Each physical building or campus that needs security upgrades is a separate facility in the system. Add the address, describe occupancy (days/hours, population served, children\'s areas), and note any existing security concerns. Each facility gets its own risk assessment and set of project proposals.',
      why: 'FEMA evaluates facilities individually. Each facility\'s threat profile, budget, and projects are reviewed separately. Detailed occupancy information strengthens your case for funding.',
      tips: [
        'Be specific about hours of operation — "Sunday 9am–1pm" is better than "weekends."',
        'Document whether the facility serves children — this is a scoring factor.',
        'Add all facilities before you start documenting threats.',
      ],
      status: s(2, step2Done),
      count: facilityCount > 0 ? `${facilityCount} added` : undefined,
      cta: { label: facilityCount > 0 ? 'Manage facilities' : 'Add your first facility', href: facilityCount > 0 ? '/facilities' : '/facilities/new' },
      secondaryCta: facilityCount > 0 ? { label: 'Add another facility', href: '/facilities/new' } : undefined,
    },
    {
      number: 3,
      title: 'Document threats for each facility',
      eyebrow: 'Security risks scored by likelihood × impact',
      description:
        'For each facility, identify and score the security threats it faces. Rate each threat on likelihood (1–5) and impact (1–5) to produce a risk score. Threats can range from active shooter scenarios to vandalism, cyberattack, or natural disaster. The 5×5 risk matrix shows your threat landscape visually.',
      why: 'Threat documentation is the backbone of your application. Every project proposal must be traceable to at least one documented threat. Unlinked projects are a red flag for reviewers and a common rejection reason.',
      tips: [
        'Law enforcement assessments carry more weight — request one early.',
        'Document incident history even if no incidents occurred ("no incidents in past 3 years" is useful context).',
        'Score conservatively — overestimating likelihood is better than understating impact.',
        'Aim for 3–8 threats per facility to show comprehensive analysis.',
      ],
      status: s(3, step3Done),
      count: threatCount > 0 ? `${threatCount} total` : undefined,
      blocker: step3Blocker,
      cta: { label: 'Open facilities', href: '/facilities' },
    },
    {
      number: 4,
      title: 'Record existing security measures',
      eyebrow: 'Current security infrastructure and its gaps',
      description:
        'Document what security measures are already in place at each facility — cameras, access control, lighting, trained staff, alarm systems, etc. Rate their effectiveness and note remaining gaps. This establishes your baseline security posture before the proposed improvements.',
      why: 'Reviewers need to see that you understand your current state before requesting improvements. Existing measures show good stewardship; documented gaps directly justify your project proposals.',
      tips: [
        'Include "soft" measures like security policies, staff training, and emergency plans.',
        'Be honest about effectiveness ratings — a camera system that doesn\'t record is not effective.',
        'The gaps you document here should map to your project proposals.',
      ],
      status: s(4, step4Done),
      count: measureCount > 0 ? `${measureCount} recorded` : undefined,
      blocker: step4Blocker,
      cta: { label: 'Open facilities', href: '/facilities' },
    },
    {
      number: 5,
      title: 'Create project proposals',
      eyebrow: 'Security improvements linked to documented threats',
      description:
        'For each facility, define the security improvement projects you\'re requesting funding for. Each project needs a clear problem statement (derived from your threats), a proposed solution, and a rationale for how it reduces risk. Critically, each project must be linked to at least one documented threat.',
      why: 'Projects are what you\'re actually requesting money for. FEMA wants a clear line from documented threat → existing gap → proposed solution → risk reduction. Missing threat linkage is the #1 reason projects get cut during review.',
      tips: [
        'One project per security category works well (e.g., one for access control, one for cameras).',
        'The problem statement should quote or reference your threat assessments.',
        'Avoid vague solutions — "install 8 IP cameras covering the main entrance and parking lot" beats "improve surveillance."',
        'Priority 1 projects will receive the most scrutiny — make sure they\'re airtight.',
      ],
      status: s(5, step5Done),
      count: projectCount > 0 ? `${projectCount} created` : undefined,
      blocker: step5Blocker,
      cta: { label: 'Open facilities', href: '/facilities' },
    },
    {
      number: 6,
      title: 'Add budget items with justification',
      eyebrow: 'Itemized costs for every proposed project',
      description:
        'Break each project down into line-item budget entries: quantity, unit cost, vendor name, and a written justification. Every dollar needs to be accounted for and justified. Get vendor quotes where possible — actual quotes strengthen your budget credibility significantly.',
      why: 'FEMA conducts a budget review on every application. Line items without justification text are routinely cut or reduced. Budgets with vendor quotes and clear cost rationale are approved at much higher rates.',
      tips: [
        'Get at least one vendor quote per major line item.',
        'Installation and labor costs are allowable — include them.',
        'Don\'t bundle items — a camera system should list cameras, cabling, NVR, and installation separately.',
        'Avoid round numbers (e.g., "$5,000") — they signal estimates, not real quotes.',
      ],
      status: s(6, step6Done),
      count: budgetItemCount > 0 ? `${budgetItemCount} items` : undefined,
      blocker: step6Blocker,
      cta: { label: 'Open facilities', href: '/facilities' },
    },
    {
      number: 7,
      title: 'Draft your grant narratives',
      eyebrow: 'Compelling text that ties the application together',
      description:
        'Write the narrative sections for your application — organizational background, physical security plan, and project justifications. Use the AI assist (✨ button) to generate a first draft from your existing data, then refine it. Strong narratives synthesize your threats, gaps, and projects into a coherent story.',
      why: 'Reviewers read narratives to assess the applicant\'s understanding of their own risk. A well-written narrative can elevate a borderline application; a weak one can sink a strong one. The AI drafts save hours of work.',
      tips: [
        'Use the ✨ sparkle button in text fields to generate an AI first draft.',
        'Reference specific threat scores and incident history in your narratives.',
        'Write for a reviewer who has never visited your facility — be explicit and specific.',
        'Have a non-expert read the narrative — if they understand the risk, reviewers will too.',
      ],
      status: s(7, step7Done),
      count: narrativeCount > 0 ? `${narrativeCount} drafted` : undefined,
      blocker: step7Blocker,
      cta: { label: 'Open facilities', href: '/facilities' },
    },
    {
      number: 8,
      title: 'Review readiness & export',
      eyebrow: 'Final check before submission',
      description:
        'Run the readiness review to get a scored assessment of each facility\'s application completeness. The review checks for missing fields, unlinked projects, unjustified budget items, and narrative gaps. Once you\'re satisfied, export your application packet for submission through the FEMA Grants Outcomes (GO) system.',
      why: 'The NSGP application is submitted through FEMA GO, not directly from this tool. Your export gives you a structured summary of all the information you\'ll need to enter. Submitting through GO requires an authorized organization representative.',
      tips: [
        'Run the readiness review before the final week — fixes take time.',
        'Have your organization\'s DUNS/SAM.gov registration current before submission.',
        'The submission deadline is May 29, 2026 — late submissions are not accepted.',
        'Keep copies of all vendor quotes and supporting documentation.',
      ],
      status: s(8, step8Done),
      cta: { label: 'Open readiness review', href: '/readiness' },
      secondaryCta: { label: 'View all facilities', href: '/facilities' },
    },
  ]

  const doneCount = statuses.filter(Boolean).length
  const totalSteps = 7 // step 8 is always "in progress"

  return { steps, doneCount, totalSteps, activeStep }
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function GuidePage() {
  const { steps, doneCount, totalSteps, activeStep } = await getProgress()

  const overallPct = Math.round((doneCount / totalSteps) * 100)

  return (
    <div className="px-12 pb-16 max-w-[960px]">

      {/* Page header */}
      <div className="pt-9 pb-7">
        <p className="eyebrow mb-2.5">FY2026 Application Cycle · Step-by-step guide</p>
        <h1
          className="font-serif font-medium leading-[1.05]"
          style={{ fontSize: '40px', letterSpacing: '-0.025em', color: 'var(--ink)' }}
        >
          Application Guide
        </h1>
        <p className="mt-2.5 text-[14.5px]" style={{ color: 'var(--ink-3)', maxWidth: '560px' }}>
          Follow these steps in order to build a complete, submission-ready NSGP grant application.
          Each step tracks your real progress automatically.
        </p>
      </div>

      {/* Progress summary bar */}
      <div
        className="rounded-sm p-5 mb-8 grid items-center gap-6"
        style={{
          background: 'white',
          border: '1px solid var(--rule)',
          gridTemplateColumns: '1fr auto',
        }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <p className="font-mono-label" style={{ fontSize: '10px', color: 'var(--ink-3)' }}>
              Overall progress
            </p>
            <span
              className="text-[11.5px] tabular-nums"
              style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}
            >
              {doneCount} of {totalSteps} steps complete
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--rule-2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${overallPct}%`,
                background: overallPct >= 80 ? 'var(--ok)' : overallPct >= 40 ? 'var(--warn)' : 'var(--nav-accent)',
              }}
            />
          </div>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {steps.slice(0, 7).map(step => (
              <div
                key={step.number}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: step.status === 'done' ? 'var(--ok)' : step.status === 'active' ? 'var(--nav-accent)' : 'var(--ink-4)' }}
              >
                {step.status === 'done'
                  ? <CheckCircle2 className="h-3 w-3" />
                  : <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px]" style={{ fontFamily: 'var(--font-geist-mono)' }}>{step.number}</span>
                }
                <span className="hidden sm:inline">{step.title.split(' ').slice(0, 2).join(' ')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className="font-serif font-medium tabular-nums"
            style={{ fontSize: '42px', letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: '1' }}
          >
            {overallPct}<span style={{ fontSize: '20px', color: 'var(--ink-3)' }}>%</span>
          </p>
          <p className="text-[11.5px] mt-1" style={{ color: 'var(--ink-3)' }}>
            {doneCount === totalSteps ? 'Ready to review' : `Step ${activeStep} is next`}
          </p>
        </div>
      </div>

      {/* Steps accordion */}
      <GuideSteps steps={steps} initialOpen={activeStep} />

      {/* Footer note */}
      <div className="mt-8 px-5 py-4 rounded-sm" style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)' }}>
        <p className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
          <strong style={{ color: 'var(--ink-2)' }}>Important:</strong> This guide reflects the recommended order for a complete application. You can work in any order, but steps build on each other — threat documentation must precede project proposals, and projects must be budgeted before narratives make sense to write.
          The{' '}
          <span style={{ color: 'var(--ink)' }}>FY26 submission deadline is May 29, 2026</span>{' '}
          through FEMA Grants Outcomes (GO). This tool exports your data for entry into GO — it does not submit directly.
        </p>
      </div>
    </div>
  )
}
