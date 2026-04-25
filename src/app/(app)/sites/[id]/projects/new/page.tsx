'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/actions/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Header } from '@/components/layout/header'
import { AiAssistTextarea } from '@/components/shared/ai-assist-textarea'
import { toast } from 'sonner'
import Link from 'next/link'
import { use } from 'react'

const CATEGORIES = [
  'Physical Barriers / Perimeter',
  'Access Control Systems',
  'Video Surveillance (CCTV)',
  'Lighting',
  'Alarm / Intrusion Detection',
  'Communication Systems',
  'Ballistic Protection',
  'Training & Capacity Building',
  'Planning & Assessment',
  'Other',
]

export default function NewProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [priority, setPriority] = useState(3)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectCategory, setProjectCategory] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await createProject({
      siteId: id,
      title: formData.get('title') as string,
      category: formData.get('category') as string || undefined,
      problemStatement: formData.get('problemStatement') as string || undefined,
      proposedSolution: formData.get('proposedSolution') as string || undefined,
      riskReductionRationale: formData.get('riskReductionRationale') as string || undefined,
      implementationNotes: formData.get('implementationNotes') as string || undefined,
      priority,
      status: 'draft',
      notes: formData.get('notes') as string || undefined,
    })

    if (result.success && result.data) {
      toast.success('Project created')
      router.push(`/sites/${id}/projects/${result.data.id}`)
    } else {
      toast.error(result.error || 'Failed to create project')
      setLoading(false)
    }
  }

  const aiContext = {
    'Project Title': projectTitle,
    'Project Category': projectCategory,
    'Priority': `${priority}/5`,
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Sites', href: '/sites' },
        { label: 'Site', href: `/sites/${id}` },
        { label: 'Projects', href: `/sites/${id}/projects` },
        { label: 'New Project' },
      ]} />
      <div className="p-8 max-w-2xl">
        <PageHeader
          title="New Project Proposal"
          description="Define a security improvement project to include in the grant application."
        />

        <form onSubmit={handleSubmit}>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Project Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="Perimeter Fencing & Anti-Ram Barriers"
                  className="mt-1"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  list="categoryList"
                  placeholder="Select or type a category"
                  className="mt-1"
                  value={projectCategory}
                  onChange={(e) => setProjectCategory(e.target.value)}
                />
                <datalist id="categoryList">
                  {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <Label>Priority: <strong>{priority}/5</strong></Label>
                <p className="text-xs text-muted-foreground mb-2">1 = Lower priority, 5 = Most urgent</p>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Project Justification</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="problemStatement">Problem Statement</Label>
                <AiAssistTextarea
                  id="problemStatement"
                  name="problemStatement"
                  fieldLabel="Problem Statement"
                  context={aiContext}
                  placeholder="Describe the specific security problem this project addresses..."
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">What is the current vulnerability? What incidents or risks motivate this project?</p>
              </div>
              <div>
                <Label htmlFor="proposedSolution">Proposed Solution</Label>
                <AiAssistTextarea
                  id="proposedSolution"
                  name="proposedSolution"
                  fieldLabel="Proposed Solution"
                  context={aiContext}
                  placeholder="Describe the proposed security improvement in detail..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="riskReductionRationale">Risk Reduction Rationale</Label>
                <AiAssistTextarea
                  id="riskReductionRationale"
                  name="riskReductionRationale"
                  fieldLabel="Risk Reduction Rationale"
                  context={aiContext}
                  placeholder="How specifically does this project reduce the identified risks?"
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">This is critical for the grant narrative. Be specific about how threats are addressed.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Implementation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="implementationNotes">Implementation Notes</Label>
                <AiAssistTextarea
                  id="implementationNotes"
                  name="implementationNotes"
                  fieldLabel="Implementation Notes"
                  context={aiContext}
                  placeholder="Timeline, vendor considerations, installation approach, phasing..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <AiAssistTextarea
                  id="notes"
                  name="notes"
                  fieldLabel="Additional Notes"
                  context={aiContext}
                  placeholder="Any other relevant notes."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/sites/${id}/projects`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
