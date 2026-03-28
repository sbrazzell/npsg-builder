'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { organizationSchema, type OrganizationInput } from '@/lib/validations'

export async function getOrganizations() {
  try {
    const organizations = await prisma.organization.findMany({
      include: { facilities: true },
      orderBy: { updatedAt: 'desc' },
    })
    return { success: true, data: organizations }
  } catch (error) {
    return { success: false, error: 'Failed to fetch organizations' }
  }
}

export async function getOrganization(id: string) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        facilities: {
          include: {
            threatAssessments: true,
            securityMeasures: true,
            projectProposals: {
              include: { budgetItems: true },
            },
          },
        },
      },
    })
    if (!organization) return { success: false, error: 'Organization not found' }
    return { success: true, data: organization }
  } catch (error) {
    return { success: false, error: 'Failed to fetch organization' }
  }
}

export async function createOrganization(input: OrganizationInput) {
  const parsed = organizationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const organization = await prisma.organization.create({
      data: {
        ...parsed.data,
        contactEmail: parsed.data.contactEmail || null,
      },
    })
    revalidatePath('/organizations')
    return { success: true, data: organization }
  } catch (error) {
    return { success: false, error: 'Failed to create organization' }
  }
}

export async function updateOrganization(id: string, input: OrganizationInput) {
  const parsed = organizationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  try {
    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...parsed.data,
        contactEmail: parsed.data.contactEmail || null,
      },
    })
    revalidatePath('/organizations')
    revalidatePath(`/organizations/${id}`)
    return { success: true, data: organization }
  } catch (error) {
    return { success: false, error: 'Failed to update organization' }
  }
}

export async function deleteOrganization(id: string) {
  try {
    await prisma.organization.delete({ where: { id } })
    revalidatePath('/organizations')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete organization' }
  }
}
