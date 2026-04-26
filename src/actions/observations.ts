'use server'

import { requireAuth } from '@/lib/auth-guard'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { siteObservationSchema, type SiteObservationInput } from '@/lib/validations'

export async function getObservations(siteId: string) {
  await requireAuth()
  try {
    const observations = await prisma.siteObservation.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: observations }
  } catch (error) {
    return { success: false, error: 'Failed to fetch observations' }
  }
}

export async function createObservation(input: SiteObservationInput) {
  await requireAuth()
  const parsed = siteObservationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const observation = await prisma.siteObservation.create({ data: parsed.data })
    revalidatePath(`/sites/${parsed.data.siteId}/observations`)
    revalidatePath(`/sites/${parsed.data.siteId}`)
    return { success: true, data: observation }
  } catch (error) {
    return { success: false, error: 'Failed to create observation' }
  }
}

export async function updateObservation(id: string, input: SiteObservationInput) {
  await requireAuth()
  const parsed = siteObservationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const observation = await prisma.siteObservation.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath(`/sites/${parsed.data.siteId}/observations`)
    return { success: true, data: observation }
  } catch (error) {
    return { success: false, error: 'Failed to update observation' }
  }
}

export async function deleteObservation(id: string, siteId: string) {
  await requireAuth()
  try {
    await prisma.siteObservation.delete({ where: { id } })
    revalidatePath(`/sites/${siteId}/observations`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete observation' }
  }
}
