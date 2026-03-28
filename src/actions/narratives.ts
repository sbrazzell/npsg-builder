'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { generateNarrative } from '@/lib/narratives'
import { narrativeDraftSchema, type NarrativeDraftInput } from '@/lib/validations'

export async function getNarratives(facilityId: string) {
  try {
    const narratives = await prisma.narrativeDraft.findMany({
      where: { facilityId },
      orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }],
    })
    return { success: true, data: narratives }
  } catch (error) {
    return { success: false, error: 'Failed to fetch narratives' }
  }
}

export async function generateAndSaveNarrative(facilityId: string, sectionName: string) {
  try {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        organization: true,
        threatAssessments: true,
        securityMeasures: true,
        projectProposals: {
          include: { budgetItems: true, threatLinks: { include: { threat: true } } },
        },
      },
    })

    if (!facility) return { success: false, error: 'Facility not found' }

    const result = await generateNarrative({
      section: sectionName,
      facility,
    })

    // Find existing draft for this section or create new one
    const existing = await prisma.narrativeDraft.findFirst({
      where: { facilityId, sectionName },
      orderBy: { versionNumber: 'desc' },
    })

    const narrative = await prisma.narrativeDraft.create({
      data: {
        facilityId,
        sectionName,
        generatedText: result.text,
        editedText: result.text,
        versionNumber: (existing?.versionNumber || 0) + 1,
      },
    })

    revalidatePath(`/facilities/${facilityId}/narratives`)
    return { success: true, data: narrative }
  } catch (error) {
    return { success: false, error: 'Failed to generate narrative' }
  }
}

export async function updateNarrative(id: string, editedText: string) {
  try {
    const narrative = await prisma.narrativeDraft.update({
      where: { id },
      data: { editedText },
    })
    revalidatePath(`/facilities/${narrative.facilityId}/narratives`)
    return { success: true, data: narrative }
  } catch (error) {
    return { success: false, error: 'Failed to update narrative' }
  }
}

export async function deleteNarrative(id: string, facilityId: string) {
  try {
    await prisma.narrativeDraft.delete({ where: { id } })
    revalidatePath(`/facilities/${facilityId}/narratives`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete narrative' }
  }
}

export async function applyNarrativeRewrite(
  narrativeId: string,
  rewriteText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.narrativeDraft.findUnique({ where: { id: narrativeId } })
    if (!existing) return { success: false, error: 'Narrative not found' }

    await prisma.narrativeDraft.update({
      where: { id: narrativeId },
      data: {
        editedText: rewriteText,
        versionNumber: existing.versionNumber + 1,
      },
    })

    revalidatePath(`/facilities/${existing.facilityId}/narratives`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to apply rewrite' }
  }
}

export async function applyGeneratedRewrite(
  facilityId: string,
  sectionName: string,
  rewriteText: string
): Promise<{ success: boolean; narrativeId?: string; error?: string }> {
  try {
    const existing = await prisma.narrativeDraft.findFirst({
      where: { facilityId, sectionName },
      orderBy: { versionNumber: 'desc' },
    })

    if (existing) {
      const updated = await prisma.narrativeDraft.update({
        where: { id: existing.id },
        data: {
          editedText: rewriteText,
          versionNumber: existing.versionNumber + 1,
        },
      })
      revalidatePath(`/facilities/${facilityId}/narratives`)
      return { success: true, narrativeId: updated.id }
    } else {
      const created = await prisma.narrativeDraft.create({
        data: {
          facilityId,
          sectionName,
          generatedText: rewriteText,
          editedText: rewriteText,
          versionNumber: 1,
        },
      })
      revalidatePath(`/facilities/${facilityId}/narratives`)
      return { success: true, narrativeId: created.id }
    }
  } catch (error) {
    return { success: false, error: 'Failed to apply rewrite' }
  }
}
