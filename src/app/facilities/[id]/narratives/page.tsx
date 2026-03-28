import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { MessageSquare } from 'lucide-react'
import { NarrativeSection } from './narrative-section'

const NARRATIVE_SECTIONS = [
  { key: 'executive_summary', label: 'Executive Summary', description: 'High-level overview of the organization, facility, and grant request.' },
  { key: 'threat_overview', label: 'Threat Overview', description: 'Description of the threat environment facing this facility.' },
  { key: 'vulnerability_statement', label: 'Vulnerability Statement', description: 'Analysis of existing gaps and why current measures are insufficient.' },
  { key: 'project_justification', label: 'Project Justification', description: 'Why the proposed projects are necessary and appropriate.' },
  { key: 'implementation_approach', label: 'Implementation Approach', description: 'How projects will be carried out and sustained.' },
  { key: 'budget_rationale', label: 'Budget Rationale', description: 'Justification for each budget category.' },
]

export default async function NarrativesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      organization: true,
      narrativeDrafts: {
        orderBy: [{ sectionName: 'asc' }, { versionNumber: 'desc' }],
      },
    },
  })

  if (!facility) notFound()

  // Get latest draft per section
  const latestDrafts = new Map<string, typeof facility.narrativeDrafts[0]>()
  for (const draft of facility.narrativeDrafts) {
    if (!latestDrafts.has(draft.sectionName)) {
      latestDrafts.set(draft.sectionName, draft)
    }
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/facilities' },
        { label: facility.facilityName, href: `/facilities/${id}` },
        { label: 'Narrative Studio' },
      ]} />
      <div className="p-8">
        <PageHeader
          title="Narrative Studio"
          description="Generate and edit grant application narrative sections using template-based AI."
        />

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>How it works:</strong> Click &quot;Generate&quot; on any section to create a professional first draft based on the data you&apos;ve entered. Edit the text to refine before exporting. Each generation creates a new version.
        </div>

        <div className="space-y-4">
          {NARRATIVE_SECTIONS.map((section) => {
            const draft = latestDrafts.get(section.key)
            return (
              <NarrativeSection
                key={section.key}
                facilityId={id}
                sectionKey={section.key}
                sectionLabel={section.label}
                sectionDescription={section.description}
                draft={draft || null}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
