'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { facilitySchema, type FacilityInput } from '@/lib/validations'

export async function getFacilities() {
  try {
    const facilities = await prisma.site.findMany({
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
    const facility = await prisma.site.findUnique({
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
    const { lawEnforcementContactDate, lawEnforcementResponseDate, ...rest } = parsed.data
    const facility = await prisma.site.create({
      data: {
        ...rest,
        lawEnforcementContactDate: lawEnforcementContactDate ? new Date(lawEnforcementContactDate) : null,
        lawEnforcementResponseDate: lawEnforcementResponseDate ? new Date(lawEnforcementResponseDate) : null,
      },
    })
    revalidatePath('/sites')
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
    const { lawEnforcementContactDate, lawEnforcementResponseDate, ...rest } = parsed.data
    const facility = await prisma.site.update({
      where: { id },
      data: {
        ...rest,
        lawEnforcementContactDate: lawEnforcementContactDate ? new Date(lawEnforcementContactDate) : null,
        lawEnforcementResponseDate: lawEnforcementResponseDate ? new Date(lawEnforcementResponseDate) : null,
      },
    })
    revalidatePath('/sites')
    revalidatePath(`/sites/${id}`)
    return { success: true, data: facility }
  } catch (error) {
    return { success: false, error: 'Failed to update facility' }
  }
}

export async function deleteFacility(id: string) {
  try {
    const facility = await prisma.site.findUnique({ where: { id } })
    await prisma.site.delete({ where: { id } })
    revalidatePath('/sites')
    if (facility) revalidatePath(`/organizations/${facility.organizationId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete facility' }
  }
}
