'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'

// ─── Snapshot type ───────────────────────────────────────────────────────────

export interface FilingSnapshot {
  capturedAt: string
  organization: {
    id: string
    name: string
    denomination?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    contactName?: string | null
    contactEmail?: string | null
    contactPhone?: string | null
    einOrTaxId?: string | null
  }
  site: {
    id: string
    siteName: string
    address?: string | null
    occupancyNotes?: string | null
    populationServed?: string | null
    daysHoursOfOperation?: string | null
    childrensAreasNotes?: string | null
    parkingLotNotes?: string | null
    surroundingAreaNotes?: string | null
    publicAccessNotes?: string | null
    knownSecurityConcerns?: string | null
    notes?: string | null
    lawEnforcementAgency?: string | null
    lawEnforcementContactName?: string | null
    lawEnforcementContactDate?: string | null
    lawEnforcementResponseDate?: string | null
    lawEnforcementFindings?: string | null
  }
  threats: Array<{
    id: string
    threatType: string
    description?: string | null
    likelihood: number
    impact: number
    riskScore: number
    riskLevel: string
    vulnerabilityNotes?: string | null
    incidentHistory?: string | null
    source: string
    sourceAgency?: string | null
  }>
  securityMeasures: Array<{
    id: string
    category: string
    description?: string | null
    effectivenessRating: number
    gapsRemaining?: string | null
  }>
  projects: Array<{
    id: string
    title: string
    category?: string | null
    problemStatement?: string | null
    proposedSolution?: string | null
    riskReductionRationale?: string | null
    implementationNotes?: string | null
    priority: number
    status: string
    projectBudget: number
    budgetItems: Array<{
      id: string
      itemName: string
      category?: string | null
      quantity: number
      unitCost: number
      totalCost: number
      vendorName?: string | null
      justification?: string | null
    }>
    linkedThreatTypes: string[]
  }>
  narratives: Record<string, string>
  totalBudget: number
  highRiskThreatCount: number
  analysisScore?: number | null
}

// ─── Build snapshot from live DB data ────────────────────────────────────────

async function buildSnapshot(siteId: string): Promise<FilingSnapshot> {
  const facility = await prisma.site.findUniqueOrThrow({
    where: { id: siteId },
    include: {
      organization: true,
      threatAssessments: { orderBy: [{ likelihood: 'desc' }, { impact: 'desc' }] },
      securityMeasures: { orderBy: { category: 'asc' } },
      projectProposals: {
        include: {
          budgetItems: { orderBy: { createdAt: 'asc' } },
          threatLinks: { include: { threat: true } },
        },
        orderBy: { priority: 'asc' },
      },
      narrativeDrafts: { orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }] },
      grantAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  // Latest narrative per section
  const narratives: Record<string, string> = {}
  for (const d of facility.narrativeDrafts) {
    if (!narratives[d.sectionName]) {
      const text = d.editedText || d.generatedText || ''
      if (text.trim()) narratives[d.sectionName] = text
    }
  }

  const totalBudget = facility.projectProposals.reduce(
    (s, p) => s + p.budgetItems.reduce((b, i) => b + i.totalCost, 0), 0
  )

  const highRiskThreatCount = facility.threatAssessments.filter((t) => {
    const lvl = getRiskLevel(calculateRiskScore(t.likelihood, t.impact))
    return lvl === 'high' || lvl === 'critical'
  }).length

  const f = facility as any

  return {
    capturedAt: new Date().toISOString(),
    organization: {
      id: facility.organization.id,
      name: facility.organization.name,
      denomination: facility.organization.denomination,
      address: facility.organization.address,
      city: facility.organization.city,
      state: facility.organization.state,
      zip: facility.organization.zip,
      contactName: facility.organization.contactName,
      contactEmail: facility.organization.contactEmail,
      contactPhone: facility.organization.contactPhone,
      einOrTaxId: facility.organization.einOrTaxId,
    },
    site: {
      id: facility.id,
      siteName: facility.siteName,
      address: facility.address,
      occupancyNotes: facility.occupancyNotes,
      populationServed: facility.populationServed,
      daysHoursOfOperation: facility.daysHoursOfOperation,
      childrensAreasNotes: facility.childrensAreasNotes,
      parkingLotNotes: facility.parkingLotNotes,
      surroundingAreaNotes: facility.surroundingAreaNotes,
      publicAccessNotes: facility.publicAccessNotes,
      knownSecurityConcerns: facility.knownSecurityConcerns,
      notes: facility.notes,
      lawEnforcementAgency: f.lawEnforcementAgency,
      lawEnforcementContactName: f.lawEnforcementContactName,
      lawEnforcementContactDate: f.lawEnforcementContactDate
        ? new Date(f.lawEnforcementContactDate).toISOString() : null,
      lawEnforcementResponseDate: f.lawEnforcementResponseDate
        ? new Date(f.lawEnforcementResponseDate).toISOString() : null,
      lawEnforcementFindings: f.lawEnforcementFindings,
    },
    threats: facility.threatAssessments.map((t) => ({
      id: t.id,
      threatType: t.threatType,
      description: t.description,
      likelihood: t.likelihood,
      impact: t.impact,
      riskScore: calculateRiskScore(t.likelihood, t.impact),
      riskLevel: getRiskLevel(calculateRiskScore(t.likelihood, t.impact)),
      vulnerabilityNotes: t.vulnerabilityNotes,
      incidentHistory: t.incidentHistory,
      source: (t as any).source ?? 'self_assessed',
      sourceAgency: (t as any).sourceAgency ?? null,
    })),
    securityMeasures: facility.securityMeasures.map((m) => ({
      id: m.id,
      category: m.category,
      description: m.description,
      effectivenessRating: m.effectivenessRating,
      gapsRemaining: m.gapsRemaining,
    })),
    projects: facility.projectProposals.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      problemStatement: p.problemStatement,
      proposedSolution: p.proposedSolution,
      riskReductionRationale: p.riskReductionRationale,
      implementationNotes: p.implementationNotes,
      priority: p.priority,
      status: p.status,
      projectBudget: p.budgetItems.reduce((s, b) => s + b.totalCost, 0),
      budgetItems: p.budgetItems.map((b) => ({
        id: b.id,
        itemName: b.itemName,
        category: b.category,
        quantity: b.quantity,
        unitCost: b.unitCost,
        totalCost: b.totalCost,
        vendorName: b.vendorName,
        justification: b.justification,
      })),
      linkedThreatTypes: p.threatLinks.map((l) => l.threat.threatType),
    })),
    narratives,
    totalBudget,
    highRiskThreatCount,
    analysisScore: facility.grantAnalyses[0]?.overallScore ?? null,
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createDraft(siteId: string, title: string, notes?: string) {
  try {
    const snapshot = await buildSnapshot(siteId)

    // Next version number
    const last = await prisma.applicationDraft.findFirst({
      where: { siteId },
      orderBy: { version: 'desc' },
    })
    const version = (last?.version ?? 0) + 1

    const draft = await prisma.applicationDraft.create({
      data: {
        siteId,
        version,
        title,
        notes: notes || null,
        status: 'draft',
        snapshotJson: JSON.stringify(snapshot),
      },
    })
    revalidatePath(`/sites/${siteId}/filings`)
    return { success: true, data: draft }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to create draft' }
  }
}

export async function listDrafts(siteId: string) {
  try {
    const drafts = await prisma.applicationDraft.findMany({
      where: { siteId },
      orderBy: { version: 'desc' },
    })
    return { success: true, data: drafts }
  } catch {
    return { success: false, error: 'Failed to fetch drafts' }
  }
}

export async function getDraft(id: string) {
  try {
    const draft = await prisma.applicationDraft.findUniqueOrThrow({ where: { id } })
    const snapshot: FilingSnapshot = JSON.parse(draft.snapshotJson)
    return { success: true, data: { ...draft, snapshot } }
  } catch {
    return { success: false, error: 'Draft not found' }
  }
}

export async function updateDraftStatus(id: string, status: 'draft' | 'final') {
  try {
    const draft = await prisma.applicationDraft.findUniqueOrThrow({ where: { id } })

    // If marking as final, demote any existing final for this facility
    if (status === 'final') {
      await prisma.applicationDraft.updateMany({
        where: { siteId: draft.siteId, status: 'final' },
        data: { status: 'draft' },
      })
    }

    await prisma.applicationDraft.update({ where: { id }, data: { status } })
    revalidatePath(`/sites/${draft.siteId}/filings`)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update status' }
  }
}

export async function updateDraftNotes(id: string, notes: string) {
  try {
    const draft = await prisma.applicationDraft.update({ where: { id }, data: { notes } })
    revalidatePath(`/sites/${draft.siteId}/filings`)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update notes' }
  }
}

export async function deleteDraft(id: string) {
  try {
    const draft = await prisma.applicationDraft.findUniqueOrThrow({ where: { id } })
    await prisma.applicationDraft.delete({ where: { id } })
    revalidatePath(`/sites/${draft.siteId}/filings`)
    return { success: true, siteId: draft.siteId }
  } catch {
    return { success: false, error: 'Failed to delete draft' }
  }
}
