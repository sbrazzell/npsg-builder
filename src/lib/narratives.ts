export type NarrativeProvider = 'template' | 'openai' | 'anthropic'

export interface NarrativeRequest {
  section: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  facility: any // full facility with relations
  context?: string
}

export interface NarrativeResult {
  text: string
  provider: NarrativeProvider
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateThreatOverview(facility: any): string {
  const threats = facility.threatAssessments || []
  if (threats.length === 0) {
    return `${facility.siteName} has not yet completed a formal threat assessment. A comprehensive review of potential threats should be conducted prior to submitting this grant application.`
  }

  const highRisk = threats.filter((t: { likelihood: number; impact: number }) => t.likelihood * t.impact >= 10)
  const threatTypes = threats.map((t: { threatType: string }) => t.threatType).join(', ')

  return `${facility.siteName} faces a range of documented security threats that create meaningful risk to occupants, including ${threatTypes}. ${
    highRisk.length > 0
      ? `Of particular concern are ${highRisk.length} threat(s) rated at high or critical risk levels, indicating both significant likelihood of occurrence and potential for serious harm.`
      : 'Current threat assessments indicate moderate risk levels that, without mitigation, have the potential to escalate.'
  } The facility${facility.surroundingAreaNotes ? `, situated in an area where ${facility.surroundingAreaNotes.toLowerCase()},` : ''} requires targeted security improvements to adequately protect the populations it serves.`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateVulnerabilityStatement(facility: any): string {
  const measures = facility.securityMeasures || []
  const threats = facility.threatAssessments || []
  const concerns = facility.knownSecurityConcerns

  const lowEffectiveness = measures.filter((m: { effectivenessRating: number }) => m.effectivenessRating <= 2)
  const gapsText = measures
    .filter((m: { gapsRemaining: string | null }) => m.gapsRemaining)
    .map((m: { gapsRemaining: string }) => m.gapsRemaining)
    .join(' ')

  return `Despite existing security measures${measures.length > 0 ? ` including ${measures.map((m: { category: string }) => m.category).join(', ')}` : ''}, ${facility.siteName} retains critical vulnerabilities that leave occupants exposed to foreseeable harm. ${
    lowEffectiveness.length > 0
      ? `${lowEffectiveness.length} of the current measures are rated as low effectiveness, indicating significant gaps in the security posture.`
      : ''
  }${gapsText ? ` Key gaps include: ${gapsText}` : ''} ${concerns ? `Facility staff have identified the following known security concerns: ${concerns}` : ''} ${
    threats.length > 0
      ? `The identified threats—${threats.map((t: { threatType: string }) => t.threatType).join(', ')}—exploit these vulnerabilities directly, and without corrective investment, the risk of a security incident remains elevated.`
      : 'Without targeted investment in security infrastructure, the organization cannot ensure a reasonable standard of safety for those in its care.'
  }`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateProjectJustification(project: any): string {
  const threatCount = project.threatLinks?.length || 0

  return `The proposed project, "${project.title}", directly addresses${threatCount > 0 ? ` ${threatCount} documented threat(s)` : ' identified security vulnerabilities'} at the facility. ${
    project.problemStatement
      ? `The core problem is as follows: ${project.problemStatement}`
      : 'The current security infrastructure is insufficient to adequately protect the facility.'
  } ${
    project.proposedSolution
      ? `The proposed solution—${project.proposedSolution}—represents a targeted, cost-effective response to the identified risk.`
      : ''
  } ${
    project.riskReductionRationale
      ? `This investment reduces risk because: ${project.riskReductionRationale}`
      : 'The proposed investment would reduce risk by closing the gap between current vulnerabilities and an acceptable standard of physical security.'
  }`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateBudgetRationale(items: any[]): string {
  if (items.length === 0) {
    return 'No budget items have been entered for this project. A detailed budget breakdown should be added prior to submission.'
  }

  let total = 0
  for (const item of items) { total += item.totalCost }
  const categories = [...new Set(items.map((i: { category: string | null }) => i.category).filter(Boolean))]
  const itemNames = items.map((i: { itemName: string }) => i.itemName).slice(0, 3).join(', ')

  return `The total project budget of $${total.toLocaleString()} reflects current market pricing and is organized across ${categories.length > 0 ? `${categories.length} budget categories: ${categories.join(', ')}` : 'the following line items'}. Key expenditures include ${itemNames}${items.length > 3 ? `, and ${items.length - 3} additional items` : ''}. Each budget line item has been selected based on operational necessity and community pricing. The requested funding represents a targeted investment that would bring the facility into alignment with recommended non-profit security standards.`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateImplementationApproach(project: any): string {
  return `Implementation of "${project.title}" will follow a structured approach to minimize disruption to facility operations and ensure the long-term effectiveness of security improvements. ${
    project.implementationNotes
      ? project.implementationNotes
      : 'The organization will engage qualified vendors through a competitive bid process, ensuring cost accountability and quality assurance throughout the installation.'
  } Installed systems will be maintained according to manufacturer specifications, with designated staff responsible for ongoing monitoring and reporting. The organization is committed to sustaining the security improvements beyond the grant period through its operating budget.`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateExecutiveSummary(facility: any): string {
  const org = facility.organization
  const projects = facility.projectProposals || []
  let totalBudget = 0
  for (const p of projects) {
    for (const b of (p.budgetItems || [])) { totalBudget += b.totalCost }
  }

  return `${org?.name || 'The applicant organization'} respectfully submits this application for Nonprofit Security Grant Program funding to support security improvements at ${facility.siteName}${facility.address ? ` located at ${facility.address}` : ''}. ${
    facility.populationServed
      ? `The facility serves ${facility.populationServed}, representing a population that deserves the protection of a secure environment.`
      : 'The facility serves community members who depend on a safe environment to access essential programs and services.'
  } ${
    projects.length > 0
      ? `This application encompasses ${projects.length} security project${projects.length > 1 ? 's' : ''} totaling $${totalBudget.toLocaleString()} in requested funding.`
      : 'This application outlines the security needs of the facility and the organization\'s commitment to addressing them.'
  } The proposed improvements will meaningfully reduce the risk of targeted violence, unauthorized access, and other security incidents, allowing the organization to fulfill its mission with greater confidence in the safety of those it serves.`
}

export async function generateNarrative(req: NarrativeRequest): Promise<NarrativeResult> {
  const provider = (process.env.NARRATIVE_PROVIDER as NarrativeProvider) || 'template'

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (apiKey) {
      const text = await generateNarrativeWithClaude(req, apiKey)
      return { text, provider: 'anthropic' }
    }
  }

  // Template fallback
  let text = ''

  switch (req.section) {
    case 'threat_overview':
      text = generateThreatOverview(req.facility)
      break
    case 'vulnerability_statement':
      text = generateVulnerabilityStatement(req.facility)
      break
    case 'project_justification':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text = generateProjectJustification(req.facility?.projectProposals?.[0] || req.context || {})
      break
    case 'budget_rationale':
      text = generateBudgetRationale(req.facility?.projectProposals?.[0]?.budgetItems || [])
      break
    case 'implementation_approach':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text = generateImplementationApproach(req.facility?.projectProposals?.[0] || req.context || {})
      break
    case 'executive_summary':
      text = generateExecutiveSummary(req.facility)
      break
    default:
      text = `This section covers ${req.section.replace(/_/g, ' ')} for ${req.facility?.siteName || 'the facility'}. Please edit this draft to reflect specific details about your organization's security needs and proposed solutions.`
  }

  return { text, provider: 'template' }
}

async function generateNarrativeWithClaude(req: NarrativeRequest, apiKey: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })

  const facility = req.facility
  const sectionLabel = req.section.replace(/_/g, ' ')

  const threats = facility?.threatAssessments || []
  const projects = facility?.projectProposals || []
  const measures = facility?.securityMeasures || []

  let totalBudget = 0
  for (const p of projects) {
    for (const b of (p.budgetItems || [])) { totalBudget += b.totalCost }
  }

  const prompt = `You are a professional grant writer specializing in FEMA Nonprofit Security Grant Program (NSGP) applications. Write the "${sectionLabel}" section for the following facility.

Write 2-4 paragraphs of polished, grant-ready prose. Be specific, use the data provided, and write in formal professional English. Do not include headers or section labels — only the body text.

Facility: ${facility?.siteName ?? 'Unknown'}
Organization: ${facility?.organization?.name ?? 'Unknown'}
Address: ${facility?.address ?? 'Not provided'}
Population served: ${facility?.populationServed ?? 'Not specified'}
Days/hours of operation: ${facility?.daysHoursOfOperation ?? 'Not specified'}
Known security concerns: ${facility?.knownSecurityConcerns ?? 'None listed'}
Surrounding area notes: ${facility?.surroundingAreaNotes ?? 'None'}

Threats documented (${threats.length}): ${threats.map((t: { threatType: string; likelihood: number; impact: number }) => `${t.threatType} (likelihood ${t.likelihood}, impact ${t.impact})`).join('; ') || 'None'}

Existing security measures (${measures.length}): ${measures.map((m: { category: string; effectivenessRating: number }) => `${m.category} (effectiveness ${m.effectivenessRating}/5)`).join('; ') || 'None'}

Projects proposed (${projects.length}): ${projects.map((p: { title: string; category: string }) => `${p.title} (${p.category})`).join('; ') || 'None'}
Total budget requested: $${totalBudget.toLocaleString()}

${req.context ? `Additional context: ${req.context}` : ''}

Write the "${sectionLabel}" section now:`

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}
