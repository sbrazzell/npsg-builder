'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { projectProposalSchema, type ProjectProposalInput } from '@/lib/validations'

export async function getProjects(facilityId: string) {
  try {
    const projects = await prisma.projectProposal.findMany({
      where: { facilityId },
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
  try {
    const project = await prisma.projectProposal.findUnique({
      where: { id },
      include: {
        budgetItems: true,
        threatLinks: { include: { threat: true } },
        facility: { include: { organization: true } },
      },
    })
    if (!project) return { success: false, error: 'Project not found' }
    return { success: true, data: project }
  } catch (error) {
    return { success: false, error: 'Failed to fetch project' }
  }
}

export async function createProject(input: ProjectProposalInput) {
  const parsed = projectProposalSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const project = await prisma.projectProposal.create({ data: parsed.data })
    revalidatePath(`/facilities/${parsed.data.facilityId}/projects`)
    revalidatePath(`/facilities/${parsed.data.facilityId}`)
    return { success: true, data: project }
  } catch (error) {
    return { success: false, error: 'Failed to create project' }
  }
}

export async function updateProject(id: string, input: ProjectProposalInput) {
  const parsed = projectProposalSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const project = await prisma.projectProposal.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath(`/facilities/${parsed.data.facilityId}/projects`)
    revalidatePath(`/facilities/${parsed.data.facilityId}/projects/${id}`)
    return { success: true, data: project }
  } catch (error) {
    return { success: false, error: 'Failed to update project' }
  }
}

export async function deleteProject(id: string, facilityId: string) {
  try {
    await prisma.projectProposal.delete({ where: { id } })
    revalidatePath(`/facilities/${facilityId}/projects`)
    revalidatePath(`/facilities/${facilityId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete project' }
  }
}

export async function linkThreatToProject(projectId: string, threatId: string) {
  try {
    await prisma.projectThreatLink.create({
      data: { projectId, threatId },
    })
    const project = await prisma.projectProposal.findUnique({ where: { id: projectId } })
    if (project) revalidatePath(`/facilities/${project.facilityId}/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to link threat to project' }
  }
}

export async function unlinkThreatFromProject(projectId: string, threatId: string) {
  try {
    await prisma.projectThreatLink.deleteMany({
      where: { projectId, threatId },
    })
    const project = await prisma.projectProposal.findUnique({ where: { id: projectId } })
    if (project) revalidatePath(`/facilities/${project.facilityId}/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to unlink threat from project' }
  }
}
