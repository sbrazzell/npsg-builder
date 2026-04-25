import Anthropic from '@anthropic-ai/sdk'
import { AnalysisResult } from './types'

export async function runLLMReview(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  facilityData: any,
  provider: 'anthropic' | 'openai'
): Promise<Partial<AnalysisResult>> {
  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return {
        strengthsSummary:
          '[LLM review mode is set to "anthropic" but ANTHROPIC_API_KEY is not configured.]',
      }
    }

    const client = new Anthropic({ apiKey })
    const prompt = buildReviewPrompt(facilityData)
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return parseReviewResponse(text)
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return {
        strengthsSummary:
          '[LLM review mode is set to "openai" but OPENAI_API_KEY is not configured.]',
      }
    }
    // OpenAI not yet wired — fall through
  }

  return {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildReviewPrompt(facilityData: any): string {
  const threats = facilityData?.threatAssessments || []
  const projects = facilityData?.projectProposals || []
  const measures = facilityData?.securityMeasures || []
  const narratives = facilityData?.narrativeDrafts || []

  const highRiskThreats = threats.filter(
    (t: { likelihood: number; impact: number }) => t.likelihood * t.impact >= 12
  )

  let totalBudget = 0
  for (const p of projects) {
    for (const b of (p.budgetItems || [])) { totalBudget += b.totalCost }
  }

  return `You are an expert reviewer for the FEMA Nonprofit Security Grant Program (NSGP). Evaluate this site's grant application data and provide actionable feedback.

Site: ${facilityData?.siteName ?? 'Unknown'}
Population served: ${facilityData?.populationServed ?? 'Not specified'}
Known security concerns: ${facilityData?.knownSecurityConcerns ?? 'None listed'}

Threats documented: ${threats.length} (${highRiskThreats.length} high-risk)
Existing security measures: ${measures.length}
Projects proposed: ${projects.length}
Total budget requested: $${totalBudget.toLocaleString()}
Narrative sections drafted: ${narratives.length}

Project titles: ${projects.map((p: { title: string }) => p.title).join(', ') || 'None'}

Respond ONLY with valid JSON in this exact shape:
{
  "strengthsSummary": "2-3 sentences on what this application does well",
  "weaknessesSummary": "2-3 sentences on the biggest gaps or weaknesses",
  "priorityFixesSummary": "3 numbered action items the applicant should address before submission"
}`
}

function parseReviewResponse(text: string): Partial<AnalysisResult> {
  try {
    const json = JSON.parse(text)
    return {
      strengthsSummary: json.strengthsSummary,
      weaknessesSummary: json.weaknessesSummary,
      priorityFixesSummary: json.priorityFixesSummary,
    }
  } catch {
    return { strengthsSummary: text }
  }
}
