'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { facilitySchema, type FacilityInput } from '@/lib/validations'

export async function getFacilities() {
  try {
    const facilities = await prisma.facility.findMany({
      include: {
        organization: true,
        threatAssessments: true,
        projectProposals: { include: { budgetItems: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return { success: true, data: facilities }
  } catch (error) {
    return { success: false, error: 'Failed to fetch facilities' }
  }
}

export async function getFacility(id: string) {
  try {
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        organization: true,
        threatAssessments: {
          include: { projectLinks: true },
          orderBy: { createdAt: 'desc' },
        },
        securityMeasures: { orderBy: { createdAt: 'desc' } },
        projectProposals: {
          include: {
            budgetItems: true,
            threatLinks: { include: { threat: true } },
          },
          orderBy: { priority: 'asc' },
        },
        siteObservations: { orderBy: { createdAt: 'desc' } },
        narrativeDrafts: { orderBy: { createdAt: 'desc' } },
        applicationPackets: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!facility) return { success: false, error: 'Facility not found' }
    return { success: true, data: facility }
  } catch (error) {
    return { success: false, error: 'Failed to fetch facility' }
  }
}

export async function createFacility(input: FacilityInput) {
  const parsed = facilitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const facility = await prisma.facility.create({ data: parsed.data })
    revalidatePath('/facilities')
    revalidatePath(`/organizations/${parsed.data.organizationId}`)
    return { success: true, data: facility }
  } catch (error) {
    return { success: false, error: 'Failed to create facility' }
  }
}

export async function updateFacility(id: string, input: FacilityInput) {
  const parsed = facilitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const facility = await prisma.facility.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath('/facilities')
    revalidatePath(`/facilities/${id}`)
    return { success: true, data: facility }
  } catch (error) {
    return { success: false, error: 'Failed to update facility' }
  }
}

export async function deleteFacility(id: string) {
  try {
    const facility = await prisma.facility.findUnique({ where: { id } })
    await prisma.facility.delete({ where: { id } })
    revalidatePath('/facilities')
    if (facility) revalidatePath(`/organizations/${facility.organizationId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete facility' }
  }
}
