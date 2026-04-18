export type Severity = 'low' | 'medium' | 'high'
export type FlagCategory = 'site' | 'threat' | 'vulnerability' | 'project' | 'budget' | 'narrative'

export interface AnalysisFlag {
  severity: Severity
  category: FlagCategory
  relatedEntityType?: string
  relatedEntityId?: string
  title: string
  explanation: string
  suggestedFix: string
}

export interface ProjectSnapshot {
  projectId: string
  projectTitle: string
  score: number
  linkedThreatsCount: number
  budgetItemCount: number
  hasProblemStatement: boolean
  hasRationale: boolean
  hasImplementationNotes: boolean
  budgetHasJustifications: boolean
  findings: string[]
}

export interface SectionReadiness {
  section: string
  label: string
  ready: boolean
  score: number // 0-100
  issues: string[]
}

export interface AnalysisResult {
  overallScore: number
  riskClarityScore: number
  vulnerabilitySpecificityScore: number
  projectAlignmentScore: number
  budgetDefensibilityScore: number
  narrativeQualityScore: number
  strengthsSummary: string
  weaknessesSummary: string
  priorityFixesSummary: string
  flags: AnalysisFlag[]
  projectSnapshots: ProjectSnapshot[]
  sectionReadiness: SectionReadiness[]
  analysisJson: string
}
