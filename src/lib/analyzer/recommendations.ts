import { detectVagueLanguage } from './scoring'

export interface NarrativeImprovements {
  detectedWeaknesses: string[]
  suggestedRewrite: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateNarrativeImprovements(
  sectionName: string,
  currentText: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  facility: any
): NarrativeImprovements {
  const weaknesses: string[] = []

  const text = currentText || ''
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  if (wordCount < 50) {
    weaknesses.push(`Too short (${wordCount} words — aim for at least 100)`)
  }

  const vagueFound = detectVagueLanguage(text)
  if (vagueFound.length > 0) {
    weaknesses.push(`Vague language detected: "${vagueFound.join('", "')}"`)
  }

  if (text.length > 0 && !text.toLowerCase().includes('because')) {
    weaknesses.push('Missing vulnerability mechanism — no "because" clause explaining why the risk exists')
  }

  if (text.length > 0 && !/(install|purchas|replac|upgrade|implement|deploy)/i.test(text)) {
    weaknesses.push('No mention of the proposed investment or solution')
  }

  if (text.length > 0 && !/(current|existing|inadequate|insufficient|lack)/i.test(text)) {
    weaknesses.push('No statement that current measures are insufficient')
  }

  if (
    text.length > 0 &&
    !/(reduce|mitigat|prevent|deter|protect|eliminat)/i.test(text)
  ) {
    weaknesses.push('No risk reduction mechanism described')
  }

  // Generate a suggested rewrite template based on section
  const facilityName = facility?.facilityName || 'the facility'
  const threatTypes =
    (facility?.threatAssessments || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((t: any) => t.threatType)
      .slice(0, 3)
      .join(', ') || 'identified security threats'

  const projectTitles =
    (facility?.projectProposals || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.title)
      .slice(0, 2)
      .join(' and ') || 'the proposed security projects'

  let suggestedRewrite = ''

  switch (sectionName) {
    case 'executive_summary':
      suggestedRewrite = `[Organization name] respectfully submits this application for Nonprofit Security Grant Program funding to address documented security vulnerabilities at ${facilityName}. The facility serves [describe population], who depend on a safe environment to access [describe services]. Following a formal security assessment identifying threats including ${threatTypes}, the organization is requesting funding for ${projectTitles}. The proposed improvements will reduce the risk of serious security incidents and allow the organization to continue serving its community without the ongoing threat of harm.`
      break
    case 'threat_overview':
      suggestedRewrite = `${facilityName} faces documented security threats that represent a credible risk to staff, congregation members, and program participants. The formal threat assessment has identified [N] specific threat categories, including ${threatTypes}. These threats are elevated because [explain specific conditions — location, prior incidents, physical vulnerabilities]. [Describe 1-2 specific prior incidents or near-misses]. Without targeted security improvements, the facility remains exposed to foreseeable harm that could have been prevented.`
      break
    case 'vulnerability_statement':
      suggestedRewrite = `Despite existing security measures, ${facilityName} retains significant vulnerabilities that create unacceptable risk. The current measures are insufficient because [specific gaps — no cameras in X area, doors are unlocked, no access control, etc.]. These vulnerabilities are directly exploited by the documented threats of ${threatTypes}. [Reference specific incident or observation that demonstrates the gap]. The proposed investments in ${projectTitles} will close these gaps by [specific mechanism — adding cameras, installing access control, etc.].`
      break
    case 'project_justification':
      suggestedRewrite = `The proposed project directly addresses [specific threat(s)] that have been documented at ${facilityName}. The current security posture is insufficient because [specific gap the project fixes]. [Cite specific incident or vulnerability]. The proposed solution — [specific hardware/system with vendor/model] — will reduce risk by [specific mechanism: deterring access, detecting intrusions, enabling rapid response, etc.]. This investment is cost-effective because [brief justification], and represents the most targeted response to the highest-priority vulnerability at this facility.`
      break
    default:
      suggestedRewrite = `[Write a specific, detailed narrative for ${sectionName.replace(/_/g, ' ')} at ${facilityName}. Include: specific threat context, prior incidents, current gaps, proposed solution with specific details, and how the investment reduces risk.]`
  }

  return {
    detectedWeaknesses: weaknesses,
    suggestedRewrite,
  }
}
