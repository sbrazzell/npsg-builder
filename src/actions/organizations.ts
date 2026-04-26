'use server'

import { requireAuth } from '@/lib/auth-guard'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { organizationSchema, type OrganizationInput } from '@/lib/validations'

export async function getOrganizations() {
  await requireAuth()
  try {
    const organizations = await prisma.organization.findMany({
      include: { sites: true },
      orderBy: { updatedAt: 'desc' },
    })
    return { success: true, data: organizations }
  } catch (error) {
    return { success: false, error: 'Failed to fetch organizations' }
  }
}

export async function getOrganization(id: string) {
  await requireAuth()
  try {
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        sites: {
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
  await requireAuth()
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
  await requireAuth()
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
  await requireAuth()
  try {
    await prisma.organization.delete({ where: { id } })
    revalidatePath('/organizations')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete organization' }
  }
}
