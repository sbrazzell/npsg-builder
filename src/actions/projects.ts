'use server'

import { requireAuth } from '@/lib/auth-guard'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { projectProposalSchema, type ProjectProposalInput } from '@/lib/validations'

export async function getProjects(siteId: string) {
  await requireAuth()
  try {
    const projects = await prisma.projectProposal.findMany({
      where: { siteId },
      include: {
        budgetItems: true,
        threatLinks: { include: { threat: true } },
      },
      orderBy: { priority: 'asc' },
    })
    return { success: true, data: projects }
  } catch (error) {
    return { success: false, error: 'Failed to fetch projects' }
  }
}

export async function getProject(id: string) {
  await requireAuth()
  try {
    const project = await prisma.projectProposal.findUnique({
      where: { id },
      include: {
        budgetItems: true,
        threatLinks: { include: { threat: true } },
        site: { include: { organization: true } },
      },
    })
    if (!project) return { success: false, error: 'Project not found' }
    return { success: true, data: project }
  } catch (error) {
    return { success: false, error: 'Failed to fetch project' }
  }
}

export async function createProject(input: ProjectProposalInput) {
  await requireAuth()
  const parsed = projectProposalSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const project = await prisma.projectProposal.create({ data: parsed.data })
    revalidatePath(`/sites/${parsed.data.siteId}/projects`)
    revalidatePath(`/sites/${parsed.data.siteId}`)
    return { success: true, data: project }
  } catch (error) {
    return { success: false, error: 'Failed to create project' }
  }
}

export async function updateProject(id: string, input: ProjectProposalInput) {
  await requireAuth()
  const parsed = projectProposalSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const project = await prisma.projectProposal.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath(`/sites/${parsed.data.siteId}/projects`)
    revalidatePath(`/sites/${parsed.data.siteId}/projects/${id}`)
    return { success: true, data: project }
  } catch (error) {
    return { success: false, error: 'Failed to update project' }
  }
}

export async function deleteProject(id: string, siteId: string) {
  await requireAuth()
  try {
    await prisma.projectProposal.delete({ where: { id } })
    revalidatePath(`/sites/${siteId}/projects`)
    revalidatePath(`/sites/${siteId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete project' }
  }
}

export async function linkThreatToProject(projectId: string, threatId: string) {
  await requireAuth()
  try {
    await prisma.projectThreatLink.create({
      data: { projectId, threatId },
    })
    const project = await prisma.projectProposal.findUnique({ where: { id: projectId } })
    if (project) revalidatePath(`/sites/${project.siteId}/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to link threat to project' }
  }
}

export async function unlinkThreatFromProject(projectId: string, threatId: string) {
  await requireAuth()
  try {
    await prisma.projectThreatLink.deleteMany({
      where: { projectId, threatId },
    })
    const project = await prisma.projectProposal.findUnique({ where: { id: projectId } })
    if (project) revalidatePath(`/sites/${project.siteId}/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to unlink threat from project' }
  }
}

export async function toggleProjectIncluded(id: string, includedInFiling: boolean, siteId: string) {
  await requireAuth()
  try {
    await prisma.projectProposal.update({ where: { id }, data: { includedInFiling } })
    revalidatePath(`/sites/${siteId}/projects`)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update project' }
  }
}

export async function reorderProjects(siteId: string, orderedIds: string[]) {
  await requireAuth()
  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.projectProposal.update({ where: { id }, data: { sortOrder: index } })
      )
    )
    revalidatePath(`/sites/${siteId}/projects`)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to reorder projects' }
  }
}

type GeneratedBudgetItemInput = {
  itemName: string
  quantity: number
  unitCost: number
  totalCost: number
  justification: string
}

type GeneratedProjectInput = {
  title: string
  category?: string
  problemStatement?: string
  proposedSolution?: string
  riskReductionRationale?: string
  implementationNotes?: string
  priority: number
  status: string
  budgetItems: GeneratedBudgetItemInput[]
  addressedThreatTypes?: string[]
}

export async function saveGeneratedProjects(siteId: string, projects: GeneratedProjectInput[]) {
  await requireAuth()
  if (!siteId || !Array.isArray(projects) || projects.length === 0) {
    return { success: false, error: 'Invalid input' }
  }

  try {
    // Build a type→id map for the site's threats so we can auto-link
    const siteThreats = await prisma.threatAssessment.findMany({
      where: { siteId },
      select: { id: true, threatType: true },
    })
    const threatTypeToId = new Map(siteThreats.map((t) => [t.threatType.toLowerCase(), t.id]))

    const existing = await prisma.projectProposal.count({ where: { siteId } })

    await Promise.all(
      projects.map(async (p, i) => {
        const created = await prisma.projectProposal.create({
          data: {
            siteId,
            title: p.title,
            category: p.category,
            problemStatement: p.problemStatement,
            proposedSolution: p.proposedSolution,
            riskReductionRationale: p.riskReductionRationale,
            implementationNotes: p.implementationNotes,
            priority: Math.min(5, Math.max(1, p.priority)),
            status: p.status,
            sortOrder: existing + i,
            budgetItems: {
              create: p.budgetItems.map((b) => ({
                itemName: b.itemName,
                quantity: b.quantity,
                unitCost: b.unitCost,
                totalCost: b.totalCost,
                justification: b.justification,
              })),
            },
          },
        })

        // Auto-create threat links from the AI's addressedThreatTypes
        if (p.addressedThreatTypes && p.addressedThreatTypes.length > 0) {
          const threatIds = p.addressedThreatTypes
            .map((t) => threatTypeToId.get(t.toLowerCase()))
            .filter((id): id is string => id !== undefined)

          if (threatIds.length > 0) {
            await Promise.all(
              threatIds.map((threatId) =>
                prisma.projectThreatLink.create({ data: { projectId: created.id, threatId } })
              )
            )
          }
        }
      })
    )

    revalidatePath(`/sites/${siteId}/projects`)
    revalidatePath(`/sites/${siteId}`)
    return { success: true, count: projects.length }
  } catch (error) {
    console.error('saveGeneratedProjects error:', error)
    return { success: false, error: 'Failed to save projects' }
  }
}
