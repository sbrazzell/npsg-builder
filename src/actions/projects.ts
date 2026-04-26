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
