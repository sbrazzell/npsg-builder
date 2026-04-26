'use server'

import { requireAuth } from '@/lib/auth-guard'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { generateNarrative } from '@/lib/narratives'
import { narrativeDraftSchema, type NarrativeDraftInput } from '@/lib/validations'

export async function getNarratives(siteId: string) {
  await requireAuth()
  try {
    const narratives = await prisma.narrativeDraft.findMany({
      where: { siteId },
      orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }],
    })
    return { success: true, data: narratives }
  } catch (error) {
    return { success: false, error: 'Failed to fetch narratives' }
  }
}

export async function generateAndSaveNarrative(siteId: string, sectionName: string) {
  await requireAuth()
  try {
    const facility = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        organization: true,
        threatAssessments: true,
        securityMeasures: true,
        projectProposals: {
          include: { budgetItems: true, threatLinks: { include: { threat: true } } },
        },
      },
    })

    if (!facility) return { success: false, error: 'Site not found' }

    const result = await generateNarrative({
      section: sectionName,
      facility,
    })

    // Find existing draft for this section or create new one
    const existing = await prisma.narrativeDraft.findFirst({
      where: { siteId, sectionName },
      orderBy: { versionNumber: 'desc' },
    })

    const narrative = await prisma.narrativeDraft.create({
      data: {
        siteId,
        sectionName,
        generatedText: result.text,
        editedText: result.text,
        versionNumber: (existing?.versionNumber || 0) + 1,
      },
    })

    revalidatePath(`/sites/${siteId}/narratives`)
    return { success: true, data: narrative }
  } catch (error) {
    return { success: false, error: 'Failed to generate narrative' }
  }
}

export async function updateNarrative(id: string, editedText: string) {
  await requireAuth()
  try {
    const narrative = await prisma.narrativeDraft.update({
      where: { id },
      data: { editedText },
    })
    revalidatePath(`/sites/${narrative.siteId}/narratives`)
    return { success: true, data: narrative }
  } catch (error) {
    return { success: false, error: 'Failed to update narrative' }
  }
}

export async function deleteNarrative(id: string, siteId: string) {
  await requireAuth()
  try {
    await prisma.narrativeDraft.delete({ where: { id } })
    revalidatePath(`/sites/${siteId}/narratives`)
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

    revalidatePath(`/sites/${existing.siteId}/narratives`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to apply rewrite' }
  }
}

export async function applyGeneratedRewrite(
  siteId: string,
  sectionName: string,
  rewriteText: string
): Promise<{ success: boolean; narrativeId?: string; error?: string }> {
  try {
    const existing = await prisma.narrativeDraft.findFirst({
      where: { siteId, sectionName },
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
      revalidatePath(`/sites/${siteId}/narratives`)
      return { success: true, narrativeId: updated.id }
    } else {
      const created = await prisma.narrativeDraft.create({
        data: {
          siteId,
          sectionName,
          generatedText: rewriteText,
          editedText: rewriteText,
          versionNumber: 1,
        },
      })
      revalidatePath(`/sites/${siteId}/narratives`)
      return { success: true, narrativeId: created.id }
    }
  } catch (error) {
    return { success: false, error: 'Failed to apply rewrite' }
  }
}
