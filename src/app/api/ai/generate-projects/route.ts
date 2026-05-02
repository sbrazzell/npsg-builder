import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface GeneratedBudgetItem {
  itemName: string
  quantity: number
  unitCost: number
  totalCost: number
  justification: string
}

export interface GeneratedProject {
  title: string
  category: string
  problemStatement: string
  proposedSolution: string
  riskReductionRationale: string
  implementationNotes: string
  priority: number
  status: 'selected' | 'consideration'
  budgetItems: GeneratedBudgetItem[]
}

export interface GenerationResult {
  projects: GeneratedProject[]
  budgetStrategy: string
  layeredSecuritySummary: string
}

function buildPrompt(siteData: {
  siteName: string
  orgName: string
  address: string | null
  threats: { threatType: string; description: string | null; likelihood: number; impact: number; vulnerabilityNotes: string | null; incidentHistory: string | null }[]
  measures: { category: string; description: string | null; effectivenessRating: number; gapsRemaining: string | null }[]
  observations: { title: string; severity: number; observationType: string | null; notes: string | null; locationDescription: string | null }[]
  existingProjectTitles: string[]
}): string {
  const { siteName, orgName, address, threats, measures, observations, existingProjectTitles } = siteData

  const threatLines = threats
    .sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact))
    .map((t, i) => {
      const score = t.likelihood * t.impact
      const level = score >= 16 ? 'CRITICAL' : score >= 10 ? 'HIGH' : score >= 5 ? 'MEDIUM' : 'LOW'
      const lines = [`${i + 1}. [${level} ${score}/25] ${t.threatType}`]
      if (t.description) lines.push(`   Description: ${t.description}`)
      if (t.vulnerabilityNotes) lines.push(`   Vulnerability: ${t.vulnerabilityNotes}`)
      if (t.incidentHistory) lines.push(`   Incidents: ${t.incidentHistory}`)
      return lines.join('\n')
    })
    .join('\n')

  const measureLines = measures
    .map((m, i) => {
      const lines = [`${i + 1}. ${m.category} (Effectiveness: ${m.effectivenessRating}/5)`]
      if (m.description) lines.push(`   Current: ${m.description}`)
      if (m.gapsRemaining) lines.push(`   Gaps: ${m.gapsRemaining}`)
      return lines.join('\n')
    })
    .join('\n')

  const observationLines = observations
    .sort((a, b) => b.severity - a.severity)
    .map((o, i) => {
      const lines = [`${i + 1}. [Severity ${o.severity}/5] ${o.title}`]
      if (o.observationType) lines.push(`   Type: ${o.observationType}`)
      if (o.locationDescription) lines.push(`   Location: ${o.locationDescription}`)
      if (o.notes) lines.push(`   Notes: ${o.notes}`)
      return lines.join('\n')
    })
    .join('\n')

  return `You are an expert FEMA Nonprofit Security Grant Program (NSGP) grant writer and physical security consultant. Your task is to generate specific, defensible project proposals for a real nonprofit site seeking NSGP funding.

SITE CONTEXT:
- Organization: ${orgName}
- Site: ${siteName}
- Address: ${address || 'Not specified'}

DOCUMENTED THREATS:
${threatLines || 'No threats documented yet.'}

EXISTING SECURITY MEASURES:
${measureLines || 'No measures documented yet.'}

FIELD OBSERVATIONS:
${observationLines || 'No observations documented yet.'}

${existingProjectTitles.length > 0 ? `ALREADY-PLANNED PROJECTS (do not duplicate):\n${existingProjectTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}` : ''}

INSTRUCTIONS:
Generate 6–10 project proposals. Classify:
- 3–5 as status="selected" (priority 4–5): address the most critical vulnerabilities, form a LAYERED security approach, combined budget $120,000–$180,000
- Remaining as status="consideration" (priority 1–3): valuable but lower priority

REQUIRED NSGP categories: "Access Control", "Surveillance", "Lighting", "Physical Hardening", "Communication"
The selected projects MUST include at minimum: one Surveillance project, one Access Control project.
Total budget for selected projects should be between $120,000 and $180,000.
Each project gets 2–4 realistic budget line items with specific item names and dollar amounts.
Use real market pricing for physical security equipment (cameras: $300–$800/unit, card readers: $400–$900/door, lighting fixtures: $150–$500/unit, etc.).

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown, no preamble. Schema:
{
  "projects": [
    {
      "title": "specific descriptive project name",
      "category": "Access Control" or "Surveillance" or "Lighting" or "Physical Hardening" or "Communication",
      "problemStatement": "2 sentences max: what security gap exists and what harm could result",
      "proposedSolution": "2 sentences max: what will be installed and how it addresses the gap",
      "riskReductionRationale": "2 sentences max: how this reduces risk; end with NSGP Physical Protective Measures alignment",
      "implementationNotes": "1 sentence: implementation approach",
      "priority": 1,
      "status": "selected" | "consideration",
      "budgetItems": [
        {
          "itemName": "string — specific product/service name",
          "quantity": number,
          "unitCost": number,
          "totalCost": number,
          "justification": "string — 1 sentence explaining why this line item is necessary"
        }
      ]
    }
  ],
  "budgetStrategy": "string — 2–3 sentences explaining why these specific projects were selected and how they work together as a layered defense",
  "layeredSecuritySummary": "string — 1–2 sentences describing how the selected projects collectively deter, detect, delay, and support response"
}

Write in formal, third-person grant language. Do not use placeholder text. Be specific to the documented threats and site context.`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI project generation requires an Anthropic API key. Add ANTHROPIC_API_KEY to your .env file.', noKey: true },
      { status: 503 }
    )
  }

  let body: { siteId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { siteId } = body
  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      organization: true,
      threatAssessments: true,
      securityMeasures: true,
      siteObservations: true,
      projectProposals: { select: { title: true } },
    },
  })

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  const prompt = buildPrompt({
    siteName: site.siteName,
    orgName: site.organization.name,
    address: site.address,
    threats: site.threatAssessments.map((t) => ({
      threatType: t.threatType,
      description: t.description,
      likelihood: t.likelihood,
      impact: t.impact,
      vulnerabilityNotes: t.vulnerabilityNotes,
      incidentHistory: t.incidentHistory,
    })),
    measures: site.securityMeasures.map((m) => ({
      category: m.category,
      description: m.description,
      effectivenessRating: m.effectivenessRating,
      gapsRemaining: m.gapsRemaining,
    })),
    observations: site.siteObservations.map((o) => ({
      title: o.title,
      severity: o.severity,
      observationType: o.observationType,
      notes: o.notes,
      locationDescription: o.locationDescription,
    })),
    existingProjectTitles: site.projectProposals.map((p) => p.title),
  })

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Extract JSON — handle markdown fences, preamble text, or trailing commentary
    let jsonText = raw
    // Strip markdown fences (```json ... ``` or ``` ... ```)
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim()
    } else {
      // Find the outermost { ... } block
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        jsonText = raw.slice(start, end + 1)
      }
    }

    let result: GenerationResult
    try {
      result = JSON.parse(jsonText)
    } catch (parseErr) {
      console.error('Project generation JSON parse error:', parseErr)
      console.error('Raw response (first 500 chars):', raw.slice(0, 500))
      return NextResponse.json(
        { error: 'AI returned an unexpected response format. Please try again.' },
        { status: 500 }
      )
    }

    // Basic validation
    if (!Array.isArray(result.projects) || result.projects.length === 0) {
      return NextResponse.json({ error: 'AI returned no projects. Please try again.' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('Project generation error:', err)
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status: number }).status
      if (status === 401) return NextResponse.json({ error: 'Invalid API key.' }, { status: 503 })
      if (status === 429) return NextResponse.json({ error: 'Rate limited. Wait a moment and try again.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Project generation failed.' }, { status: 500 })
  }
}
