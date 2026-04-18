'use server'

import { prisma } from '@/lib/prisma'
import { runAnalysis } from '@/lib/analyzer'
import { revalidatePath } from 'next/cache'

export async function runGrantAnalysis(
  siteId: string
): Promise<{ success: boolean; analysisId?: string; error?: string }> {
  try {
    const result = await runAnalysis(siteId)

    // Delete any previous analyses for this facility (keep only latest)
    await prisma.grantAnalysis.deleteMany({ where: { siteId } })

    // Create new analysis record
    const analysis = await prisma.grantAnalysis.create({
      data: {
        siteId,
        overallScore: result.overallScore,
        riskClarityScore: result.riskClarityScore,
        vulnerabilitySpecificityScore: result.vulnerabilitySpecificityScore,
        projectAlignmentScore: result.projectAlignmentScore,
        budgetDefensibilityScore: result.budgetDefensibilityScore,
        narrativeQualityScore: result.narrativeQualityScore,
        strengthsSummary: result.strengthsSummary,
        weaknessesSummary: result.weaknessesSummary,
        priorityFixesSummary: result.priorityFixesSummary,
        analysisJson: result.analysisJson,
      },
    })

    // Create flag records
    for (const flag of result.flags) {
      await prisma.grantAnalysisFlag.create({
        data: {
          grantAnalysisId: analysis.id,
          severity: flag.severity,
          category: flag.category,
          relatedEntityType: flag.relatedEntityType,
          relatedEntityId: flag.relatedEntityId,
          title: flag.title,
          explanation: flag.explanation,
          suggestedFix: flag.suggestedFix,
        },
      })
    }

    // Create project snapshot records
    for (const snapshot of result.projectSnapshots) {
      await prisma.projectAnalysisSnapshot.create({
        data: {
          grantAnalysisId: analysis.id,
          projectId: snapshot.projectId,
          score: snapshot.score,
          findingsJson: JSON.stringify({
            projectTitle: snapshot.projectTitle,
            linkedThreatsCount: snapshot.linkedThreatsCount,
            budgetItemCount: snapshot.budgetItemCount,
            hasProblemStatement: snapshot.hasProblemStatement,
            hasRationale: snapshot.hasRationale,
            hasImplementationNotes: snapshot.hasImplementationNotes,
            budgetHasJustifications: snapshot.budgetHasJustifications,
            findings: snapshot.findings,
          }),
        },
      })
    }

    revalidatePath(`/analyzer/${siteId}`)
    revalidatePath('/analyzer')

    return { success: true, analysisId: analysis.id }
  } catch (error) {
    console.error('runGrantAnalysis error:', error)
    return { success: false, error: 'Failed to run analysis. Please try again.' }
  }
}

export async function getLatestAnalysis(siteId: string) {
  try {
    const analysis = await prisma.grantAnalysis.findFirst({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      include: {
        flags: { orderBy: { severity: 'asc' } },
        projectSnapshots: true,
      },
    })
    return { success: true, data: analysis }
  } catch (error) {
    console.error('getLatestAnalysis error:', error)
    return { success: false, error: 'Failed to fetch analysis' }
  }
}

export async function listAnalyses(siteId: string) {
  try {
    const analyses = await prisma.grantAnalysis.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        overallScore: true,
        riskClarityScore: true,
        vulnerabilitySpecificityScore: true,
        projectAlignmentScore: true,
        budgetDefensibilityScore: true,
        narrativeQualityScore: true,
        createdAt: true,
      },
    })
    return { success: true, data: analyses }
  } catch (error) {
    console.error('listAnalyses error:', error)
    return { success: false, error: 'Failed to list analyses' }
  }
}

export async function getBenchmarkData() {
  try {
    const facilities = await prisma.site.findMany({
      include: {
        organization: { select: { name: true } },
        grantAnalyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            overallScore: true,
            riskClarityScore: true,
            vulnerabilitySpecificityScore: true,
            projectAlignmentScore: true,
            budgetDefensibilityScore: true,
            narrativeQualityScore: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const withAnalysis = facilities
      .filter((f) => f.grantAnalyses.length > 0)
      .map((f) => ({
        siteId: f.id,
        siteName: f.siteName,
        organizationName: f.organization.name,
        analysis: f.grantAnalyses[0]!,
      }))

    return { success: true, data: withAnalysis }
  } catch (error) {
    console.error('getBenchmarkData error:', error)
    return { success: false, error: 'Failed to fetch benchmark data' }
  }
}
