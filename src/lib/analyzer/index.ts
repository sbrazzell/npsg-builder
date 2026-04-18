import { prisma } from '@/lib/prisma'
import { AnalysisResult } from './types'
import {
  scoreRiskClarity,
  scoreVulnerabilitySpecificity,
  scoreProjectAlignment,
  scoreBudgetDefensibility,
  scoreNarrativeQuality,
  analyzeProject,
  buildSectionReadiness,
  generateStrengths,
  generateWeaknesses,
  generatePriorityFixes,
} from './scoring'
import { getAnalyzerProvider } from './llm-provider'
import { runLLMReview } from './llm-review'

export async function runAnalysis(siteId: string): Promise<AnalysisResult> {
  const facility = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      organization: true,
      threatAssessments: {
        include: { projectLinks: true },
      },
      securityMeasures: true,
      projectProposals: {
        include: {
          budgetItems: true,
          threatLinks: true,
        },
      },
      siteObservations: true,
      narrativeDrafts: {
        orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }],
      },
    },
  })

  if (!facility) {
    throw new Error(`Facility not found: ${siteId}`)
  }

  const threats = facility.threatAssessments
  const projects = facility.projectProposals
  const narratives = facility.narrativeDrafts

  // De-duplicate narratives to latest per section
  const seenSections = new Set<string>()
  const latestNarratives = []
  for (const draft of narratives) {
    if (!seenSections.has(draft.sectionName)) {
      seenSections.add(draft.sectionName)
      latestNarratives.push(draft)
    }
  }

  // Run all dimension scorers
  const riskResult = scoreRiskClarity(threats)
  const vulnResult = scoreVulnerabilitySpecificity(facility, threats)
  const alignResult = scoreProjectAlignment(projects, threats)
  const budgetResult = scoreBudgetDefensibility(projects)
  const narrativeResult = scoreNarrativeQuality(latestNarratives)

  const riskClarityScore = riskResult.score
  const vulnerabilitySpecificityScore = vulnResult.score
  const projectAlignmentScore = alignResult.score
  const budgetDefensibilityScore = budgetResult.score
  const narrativeQualityScore = narrativeResult.score

  const overallScore = Math.round(
    riskClarityScore +
      vulnerabilitySpecificityScore +
      projectAlignmentScore +
      budgetDefensibilityScore +
      narrativeQualityScore
  )

  // Collect all flags
  const flags = [
    ...riskResult.flags,
    ...vulnResult.flags,
    ...alignResult.flags,
    ...budgetResult.flags,
    ...narrativeResult.flags,
  ]

  // Project snapshots
  const projectSnapshots = projects.map((project) =>
    analyzeProject(project, threats)
  )

  // Section readiness
  const sectionReadiness = buildSectionReadiness(facility)

  // Summaries
  const dimScores = {
    riskClarityScore,
    vulnerabilitySpecificityScore,
    projectAlignmentScore,
    budgetDefensibilityScore,
    narrativeQualityScore,
    overallScore,
    flags,
  }

  let strengthsSummary = generateStrengths(dimScores)
  let weaknessesSummary = generateWeaknesses(dimScores)
  let priorityFixesSummary = generatePriorityFixes(flags)

  // Optionally enhance summaries with LLM review
  const analyzerProvider = getAnalyzerProvider()
  if (analyzerProvider !== 'rules') {
    const llmEnhancement = await runLLMReview(facility, analyzerProvider)
    if (llmEnhancement.strengthsSummary) strengthsSummary = llmEnhancement.strengthsSummary
    if (llmEnhancement.weaknessesSummary) weaknessesSummary = llmEnhancement.weaknessesSummary
    if (llmEnhancement.priorityFixesSummary) priorityFixesSummary = llmEnhancement.priorityFixesSummary
  }

  const analysisJson = JSON.stringify({
    siteId,
    siteName: facility.siteName,
    scores: {
      overall: overallScore,
      riskClarity: riskClarityScore,
      vulnerabilitySpecificity: vulnerabilitySpecificityScore,
      projectAlignment: projectAlignmentScore,
      budgetDefensibility: budgetDefensibilityScore,
      narrativeQuality: narrativeQualityScore,
    },
    flagCount: flags.length,
    projectSnapshotCount: projectSnapshots.length,
    generatedAt: new Date().toISOString(),
  })

  return {
    overallScore,
    riskClarityScore,
    vulnerabilitySpecificityScore,
    projectAlignmentScore,
    budgetDefensibilityScore,
    narrativeQualityScore,
    strengthsSummary,
    weaknessesSummary,
    priorityFixesSummary,
    flags,
    projectSnapshots,
    sectionReadiness,
    analysisJson,
  }
}
