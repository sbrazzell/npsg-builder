import { AnalysisResult } from './types'

/**
 * Run an LLM-powered review of the facility grant application data.
 *
 * MVP: function shell that validates API key presence and returns a graceful
 * fallback result if keys are not yet configured. Commented stubs show exactly
 * how to wire in Anthropic and OpenAI when keys are available.
 */
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
          '[LLM review mode is set to "anthropic" but ANTHROPIC_API_KEY is not configured. ' +
          'Add your API key to .env to enable AI-powered review. Showing rule-based strengths above.]',
      }
    }

    // --- Anthropic implementation (uncomment and install @anthropic-ai/sdk to enable) ---
    // import Anthropic from '@anthropic-ai/sdk'
    // const client = new Anthropic({ apiKey })
    // const prompt = buildReviewPrompt(facilityData)
    // const message = await client.messages.create({
    //   model: 'claude-opus-4-5',
    //   max_tokens: 1024,
    //   messages: [{ role: 'user', content: prompt }],
    // })
    // const text = message.content[0].type === 'text' ? message.content[0].text : ''
    // return parseReviewResponse(text)
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return {
        strengthsSummary:
          '[LLM review mode is set to "openai" but OPENAI_API_KEY is not configured. ' +
          'Add your API key to .env to enable AI-powered review. Showing rule-based strengths above.]',
      }
    }

    // --- OpenAI implementation (uncomment and install openai to enable) ---
    // import OpenAI from 'openai'
    // const client = new OpenAI({ apiKey })
    // const prompt = buildReviewPrompt(facilityData)
    // const completion = await client.chat.completions.create({
    //   model: 'gpt-4o',
    //   messages: [{ role: 'user', content: prompt }],
    //   max_tokens: 1024,
    // })
    // const text = completion.choices[0]?.message?.content ?? ''
    // return parseReviewResponse(text)
  }

  return {}
}

/**
 * Build the review prompt for LLM evaluation.
 * Uncomment and adapt when wiring in a real LLM provider.
 */
// function buildReviewPrompt(facilityData: any): string {
//   return `You are an expert grant reviewer for nonprofit security grant applications.
// Review the following facility data and provide:
// 1. A strengths summary (2-3 sentences)
// 2. A weaknesses summary (2-3 sentences)
// 3. Three priority fixes (numbered list)
//
// Facility: ${facilityData?.facilityName ?? 'Unknown'}
// Threat count: ${facilityData?.threatAssessments?.length ?? 0}
// Project count: ${facilityData?.projectProposals?.length ?? 0}
// Narrative count: ${facilityData?.narrativeDrafts?.length ?? 0}
//
// Respond in JSON: { "strengthsSummary": "...", "weaknessesSummary": "...", "priorityFixesSummary": "..." }`
// }

/**
 * Parse the LLM response JSON into a partial AnalysisResult.
 * Uncomment and adapt when wiring in a real LLM provider.
 */
// function parseReviewResponse(text: string): Partial<AnalysisResult> {
//   try {
//     const json = JSON.parse(text)
//     return {
//       strengthsSummary: json.strengthsSummary,
//       weaknessesSummary: json.weaknessesSummary,
//       priorityFixesSummary: json.priorityFixesSummary,
//     }
//   } catch {
//     return { strengthsSummary: text }
//   }
// }
