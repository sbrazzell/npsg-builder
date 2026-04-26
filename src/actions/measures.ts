'use server'

import { requireAuth } from '@/lib/auth-guard'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { securityMeasureSchema, type SecurityMeasureInput } from '@/lib/validations'

export async function getMeasures(siteId: string) {
  await requireAuth()
  try {
    const measures = await prisma.existingSecurityMeasure.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: measures }
  } catch (error) {
    return { success: false, error: 'Failed to fetch security measures' }
  }
}

export async function createMeasure(input: SecurityMeasureInput) {
  await requireAuth()
  const parsed = securityMeasureSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const measure = await prisma.existingSecurityMeasure.create({ data: parsed.data })
    revalidatePath(`/sites/${parsed.data.siteId}/measures`)
    revalidatePath(`/sites/${parsed.data.siteId}`)
    return { success: true, data: measure }
  } catch (error) {
    return { success: false, error: 'Failed to create security measure' }
  }
}

export async function updateMeasure(id: string, input: SecurityMeasureInput) {
  await requireAuth()
  const parsed = securityMeasureSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const measure = await prisma.existingSecurityMeasure.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath(`/sites/${parsed.data.siteId}/measures`)
    return { success: true, data: measure }
  } catch (error) {
    return { success: false, error: 'Failed to update security measure' }
  }
}

export async function deleteMeasure(id: string, siteId: string) {
  await requireAuth()
  try {
    await prisma.existingSecurityMeasure.delete({ where: { id } })
    revalidatePath(`/sites/${siteId}/measures`)
    revalidatePath(`/sites/${siteId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete security measure' }
  }
}
