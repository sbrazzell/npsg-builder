'use server'

import { requireAuth } from '@/lib/auth-guard'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { threatAssessmentSchema, type ThreatAssessmentInput } from '@/lib/validations'

export async function getThreats(siteId: string) {
  await requireAuth()
  try {
    const threats = await prisma.threatAssessment.findMany({
      where: { siteId },
      include: { projectLinks: { include: { project: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: threats }
  } catch (error) {
    return { success: false, error: 'Failed to fetch threats' }
  }
}

export async function createThreat(input: ThreatAssessmentInput) {
  await requireAuth()
  const parsed = threatAssessmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const threat = await prisma.threatAssessment.create({ data: parsed.data })
    revalidatePath(`/sites/${parsed.data.siteId}/threats`)
    revalidatePath(`/sites/${parsed.data.siteId}`)
    return { success: true, data: threat }
  } catch (error) {
    return { success: false, error: 'Failed to create threat assessment' }
  }
}

export async function updateThreat(id: string, input: ThreatAssessmentInput) {
  await requireAuth()
  const parsed = threatAssessmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const threat = await prisma.threatAssessment.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath(`/sites/${parsed.data.siteId}/threats`)
    return { success: true, data: threat }
  } catch (error) {
    return { success: false, error: 'Failed to update threat assessment' }
  }
}

export async function deleteThreat(id: string, siteId: string) {
  await requireAuth()
  try {
    await prisma.threatAssessment.delete({ where: { id } })
    revalidatePath(`/sites/${siteId}/threats`)
    revalidatePath(`/sites/${siteId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete threat assessment' }
  }
}
