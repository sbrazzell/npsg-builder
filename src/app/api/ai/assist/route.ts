import { NextRequest, NextResponse } from 'next/server'

interface AssistRequest {
  fieldLabel: string
  currentValue?: string
  context?: Record<string, string | number | undefined>
}

// Field-specific guidance so the AI writes appropriate content length/tone
const FIELD_GUIDANCE: Record<string, string> = {
  'Population Served': 'Write 1-2 concise sentences describing the demographic makeup and size of the population this site serves. Include types of people (families, youth, elderly, congregation size, etc.).',
  'Days / Hours of Operation': 'Write a concise 1-sentence summary of when this site is typically open and active.',
  'Occupancy Notes': 'Write 1-2 sentences describing how the site is occupied — peak times, gatherings, events, typical attendance numbers.',
  'Children\'s Areas': 'Write 1-2 sentences describing the children\'s spaces in the site — nurseries, classrooms, playgrounds — and why they warrant special protection.',
  'Parking Lot': 'Write 1-2 sentences describing the parking situation — lot size, lighting, access points, visibility issues.',
  'Surrounding Area': 'Write 1-2 sentences describing the neighborhood and surrounding area context relevant to security — proximity to other institutions, area crime patterns, geographic factors.',
  'Public Access': 'Write 1-2 sentences describing how the public can access this site — open to all vs. restricted, entry points, visitor management.',
  'Known Security Concerns': 'Write 2-3 sentences describing the most significant known security vulnerabilities or concerns at this site. Be specific and actionable.',
  'Additional Notes': 'Write 1-2 sentences of additional relevant context that doesn\'t fit elsewhere.',
  'Key Findings / Summary': 'Write 2-3 sentences summarizing the key threats and vulnerabilities identified in a law enforcement threat assessment. Use formal language appropriate for grant documentation.',
  'Description': 'Write 2-3 sentences describing how this specific threat type manifests at or near this type of site. Be concrete and specific.',
  'Why is this site vulnerable?': 'Write 2-3 sentences explaining the specific physical, operational, or situational conditions that make this site vulnerable to this threat. This feeds directly into the grant narrative.',
  'Incident History': 'Write 1-2 sentences describing relevant prior incidents, near-misses, or security reports that demonstrate the reality of this threat. If no specific incidents exist, describe regional trends.',
  'Problem Statement': 'Write 2-3 sentences describing the specific security problem this project addresses — what is missing, what is at risk, and what harm could result.',
  'Proposed Solution': 'Write 2-3 sentences describing the proposed security improvement in detail — what will be installed, upgraded, or implemented and how it solves the problem.',
  'Risk Reduction Rationale': 'Write 2-3 sentences explaining exactly how this project reduces the identified risks. Be specific about which threats are mitigated and by what mechanism.',
  'Implementation Notes': 'Write 1-2 sentences describing the implementation approach — vendor selection, timeline, installation method, minimal-disruption approach.',
  'Justification': 'Write 1-2 sentences justifying why this budget line item is necessary and reasonably priced for the security improvement project.',
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI assist requires an Anthropic API key. Add ANTHROPIC_API_KEY to your .env file.', noKey: true },
      { status: 503 }
    )
  }

  let body: AssistRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { fieldLabel, currentValue, context = {} } = body
  if (!fieldLabel) {
    return NextResponse.json({ error: 'fieldLabel is required' }, { status: 400 })
  }

  const guidance = FIELD_GUIDANCE[fieldLabel] ?? `Write 1-3 concise sentences for the "${fieldLabel}" field appropriate for an NSGP grant application.`

  // Build context block from whatever is available
  const contextLines = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const prompt = `You are assisting a nonprofit organization preparing a FEMA Nonprofit Security Grant Program (NSGP) grant application. Your job is to suggest concise, professional field content.

Field to fill in: "${fieldLabel}"
${contextLines ? `\nApplication context:\n${contextLines}` : ''}
${currentValue ? `\nExisting content (improve or expand if useful):\n${currentValue}` : ''}

Instructions: ${guidance}

Write ONLY the field content — no preamble, no labels, no explanation. Write in third person, professional grant-writing style. Do not use placeholder text like "[X]".`

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const suggestion =
      message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    return NextResponse.json({ suggestion })
  } catch (err: unknown) {
    console.error('AI assist error:', err)
    // Surface a specific message for common API errors
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status: number }).status
      if (status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key (401). Generate a new key at console.anthropic.com and update ANTHROPIC_API_KEY in .env.', noKey: true },
          { status: 503 }
        )
      }
      if (status === 404) {
        return NextResponse.json(
          { error: 'Model not found (404). Check that your API account has access to Claude.' },
          { status: 503 }
        )
      }
      if (status === 429) {
        return NextResponse.json(
          { error: 'Rate limited (429). Wait a moment and try again.' },
          { status: 429 }
        )
      }
    }
    return NextResponse.json({ error: 'AI generation failed. Check server logs for details.' }, { status: 500 })
  }
}
