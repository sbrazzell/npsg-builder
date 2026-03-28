'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { siteObservationSchema, type SiteObservationInput } from '@/lib/validations'

export async function getObservations(facilityId: string) {
  try {
    const observations = await prisma.siteObservation.findMany({
      where: { facilityId },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: observations }
  } catch (error) {
    return { success: false, error: 'Failed to fetch observations' }
  }
}

export async function createObservation(input: SiteObservationInput) {
  const parsed = siteObservationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const observation = await prisma.siteObservation.create({ data: parsed.data })
    revalidatePath(`/facilities/${parsed.data.facilityId}/observations`)
    revalidatePath(`/facilities/${parsed.data.facilityId}`)
    return { success: true, data: observation }
  } catch (error) {
    return { success: false, error: 'Failed to create observation' }
  }
}

export async function updateObservation(id: string, input: SiteObservationInput) {
  const parsed = siteObservationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const observation = await prisma.siteObservation.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath(`/facilities/${parsed.data.facilityId}/observations`)
    return { success: true, data: observation }
  } catch (error) {
    return { success: false, error: 'Failed to update observation' }
  }
}

export async function deleteObservation(id: string, facilityId: string) {
  try {
    await prisma.siteObservation.delete({ where: { id } })
    revalidatePath(`/facilities/${facilityId}/observations`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete observation' }
  }
}
