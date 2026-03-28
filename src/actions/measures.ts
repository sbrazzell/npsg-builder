'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { securityMeasureSchema, type SecurityMeasureInput } from '@/lib/validations'

export async function getMeasures(facilityId: string) {
  try {
    const measures = await prisma.existingSecurityMeasure.findMany({
      where: { facilityId },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: measures }
  } catch (error) {
    return { success: false, error: 'Failed to fetch security measures' }
  }
}

export async function createMeasure(input: SecurityMeasureInput) {
  const parsed = securityMeasureSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const measure = await prisma.existingSecurityMeasure.create({ data: parsed.data })
    revalidatePath(`/facilities/${parsed.data.facilityId}/measures`)
    revalidatePath(`/facilities/${parsed.data.facilityId}`)
    return { success: true, data: measure }
  } catch (error) {
    return { success: false, error: 'Failed to create security measure' }
  }
}

export async function updateMeasure(id: string, input: SecurityMeasureInput) {
  const parsed = securityMeasureSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const measure = await prisma.existingSecurityMeasure.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath(`/facilities/${parsed.data.facilityId}/measures`)
    return { success: true, data: measure }
  } catch (error) {
    return { success: false, error: 'Failed to update security measure' }
  }
}

export async function deleteMeasure(id: string, facilityId: string) {
  try {
    await prisma.existingSecurityMeasure.delete({ where: { id } })
    revalidatePath(`/facilities/${facilityId}/measures`)
    revalidatePath(`/facilities/${facilityId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete security measure' }
  }
}
