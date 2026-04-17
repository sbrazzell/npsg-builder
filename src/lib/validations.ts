import { z } from 'zod'

export const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  denomination: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  einOrTaxId: z.string().optional(),
  notes: z.string().optional(),
})

export type OrganizationInput = z.infer<typeof organizationSchema>

export const facilitySchema = z.object({
  organizationId: z.string().min(1, 'Organization is required'),
  facilityName: z.string().min(1, 'Facility name is required'),
  address: z.string().optional(),
  occupancyNotes: z.string().optional(),
  populationServed: z.string().optional(),
  daysHoursOfOperation: z.string().optional(),
  childrensAreasNotes: z.string().optional(),
  parkingLotNotes: z.string().optional(),
  surroundingAreaNotes: z.string().optional(),
  publicAccessNotes: z.string().optional(),
  knownSecurityConcerns: z.string().optional(),
  notes: z.string().optional(),
  lawEnforcementAgency: z.string().optional(),
  lawEnforcementContactName: z.string().optional(),
  lawEnforcementContactDate: z.string().optional(),
  lawEnforcementResponseDate: z.string().optional(),
  lawEnforcementFindings: z.string().optional(),
})

export type FacilityInput = z.infer<typeof facilitySchema>

export const THREAT_SOURCES = [
  { value: 'self_assessed', label: 'Self-Assessed' },
  { value: 'law_enforcement', label: 'Law Enforcement' },
  { value: 'third_party', label: 'Third-Party Assessment' },
  { value: 'media_reports', label: 'Media / Public Reports' },
] as const

export type ThreatSource = typeof THREAT_SOURCES[number]['value']

export const threatAssessmentSchema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  threatType: z.string().min(1, 'Threat type is required'),
  description: z.string().optional(),
  likelihood: z.number().int().min(1).max(5).default(3),
  impact: z.number().int().min(1).max(5).default(3),
  vulnerabilityNotes: z.string().optional(),
  incidentHistory: z.string().optional(),
  source: z.string().default('self_assessed'),
  sourceAgency: z.string().optional(),
})

export type ThreatAssessmentInput = z.infer<typeof threatAssessmentSchema>

export const securityMeasureSchema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  effectivenessRating: z.number().int().min(1).max(5).default(3),
  gapsRemaining: z.string().optional(),
  notes: z.string().optional(),
})

export type SecurityMeasureInput = z.infer<typeof securityMeasureSchema>

export const projectProposalSchema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  title: z.string().min(1, 'Project title is required'),
  category: z.string().optional(),
  problemStatement: z.string().optional(),
  proposedSolution: z.string().optional(),
  riskReductionRationale: z.string().optional(),
  implementationNotes: z.string().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  status: z.string().default('draft'),
  notes: z.string().optional(),
})

export type ProjectProposalInput = z.infer<typeof projectProposalSchema>

export const budgetItemSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  itemName: z.string().min(1, 'Item name is required'),
  category: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  unitCost: z.number().min(0).default(0),
  totalCost: z.number().min(0).default(0),
  vendorName: z.string().optional(),
  vendorUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  justification: z.string().optional(),
  notes: z.string().optional(),
})

export type BudgetItemInput = z.infer<typeof budgetItemSchema>

export const narrativeDraftSchema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  sectionName: z.string().min(1, 'Section name is required'),
  promptContext: z.string().optional(),
  generatedText: z.string().optional(),
  editedText: z.string().optional(),
  versionNumber: z.number().int().default(1),
})

export type NarrativeDraftInput = z.infer<typeof narrativeDraftSchema>

export const siteObservationSchema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  title: z.string().min(1, 'Title is required'),
  locationDescription: z.string().optional(),
  observationType: z.string().optional(),
  severity: z.number().int().min(1).max(5).default(3),
  notes: z.string().optional(),
  photoFilename: z.string().optional(),
})

export type SiteObservationInput = z.infer<typeof siteObservationSchema>
