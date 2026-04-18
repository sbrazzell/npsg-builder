'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createThreat } from '@/actions/threats'
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
import { THREAT_SOURCES } from '@/lib/validations'

const THREAT_TYPES = [
  'Active Shooter / Armed Assault',
  'Targeted Violence / Hate Crime',
  'Bomb Threat / Explosive Device',
  'Unauthorized Entry / Intrusion',
  'Vandalism / Property Damage',
  'Theft / Burglary',
  'Harassment / Stalking',
  'Domestic Violence Spillover',
  'Protest / Civil Unrest',
  'Natural Disaster',
  'Fire / Arson',
  'Cyber Attack',
]

export default function NewThreatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [likelihood, setLikelihood] = useState(3)
  const [impact, setImpact] = useState(3)
  const [source, setSource] = useState('self_assessed')
  const [threatType, setThreatType] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await createThreat({
      siteId: id,
      threatType: formData.get('threatType') as string,
      description: formData.get('description') as string || undefined,
      likelihood,
      impact,
      vulnerabilityNotes: formData.get('vulnerabilityNotes') as string || undefined,
      incidentHistory: formData.get('incidentHistory') as string || undefined,
      source,
      sourceAgency: formData.get('sourceAgency') as string || undefined,
    })

    if (result.success) {
      toast.success('Threat assessment added')
      router.push(`/sites/${id}/threats`)
    } else {
      toast.error(result.error || 'Failed to add threat')
      setLoading(false)
    }
  }

  const score = likelihood * impact
  const level = score <= 4 ? 'Low' : score <= 9 ? 'Medium' : score <= 16 ? 'High' : 'Critical'
  const levelColor = score <= 4 ? 'text-green-700 bg-green-50' : score <= 9 ? 'text-yellow-700 bg-yellow-50' : score <= 16 ? 'text-orange-700 bg-orange-50' : 'text-red-700 bg-red-50'

  const aiContext = {
    'Threat Type': threatType,
    'Likelihood': `${likelihood}/5`,
    'Impact': `${impact}/5`,
    'Assessment Source': THREAT_SOURCES.find(s => s.value === source)?.label,
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/sites' },
        { label: 'Facility', href: `/sites/${id}` },
        { label: 'Threats', href: `/sites/${id}/threats` },
        { label: 'New Threat' },
      ]} />
      <div className="p-8 max-w-2xl">
        <PageHeader
          title="Add Threat Assessment"
          description="Document a specific threat to this facility."
        />

        <form onSubmit={handleSubmit}>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Threat Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="threatType">Threat Type *</Label>
                <Input
                  id="threatType"
                  name="threatType"
                  required
                  list="threatTypeList"
                  placeholder="Select or type a threat type"
                  className="mt-1"
                  value={threatType}
                  onChange={(e) => setThreatType(e.target.value)}
                />
                <datalist id="threatTypeList">
                  {THREAT_TYPES.map((t) => <option key={t} value={t} />)}
                </datalist>
                <p className="text-xs text-muted-foreground mt-1">Choose from common types or enter a custom threat.</p>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <AiAssistTextarea
                  id="description"
                  name="description"
                  fieldLabel="Description"
                  context={aiContext}
                  placeholder="Describe how this threat manifests at this facility..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Risk Scoring
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${levelColor}`}>
                  {level} ({score}/25)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div>
                <Label>Likelihood: <strong>{likelihood}/5</strong></Label>
                <p className="text-xs text-muted-foreground mb-2">1 = Very unlikely, 5 = Near certain</p>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={likelihood}
                  onChange={(e) => setLikelihood(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Very Unlikely</span>
                  <span>Near Certain</span>
                </div>
              </div>
              <div>
                <Label>Impact: <strong>{impact}/5</strong></Label>
                <p className="text-xs text-muted-foreground mb-2">1 = Minimal harm, 5 = Catastrophic</p>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={impact}
                  onChange={(e) => setImpact(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Minimal</span>
                  <span>Catastrophic</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Assessment Source</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="source">Source *</Label>
                <select
                  id="source"
                  name="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {THREAT_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Threats identified by law enforcement carry significant weight in NSGP applications.
                </p>
              </div>
              {(source === 'law_enforcement' || source === 'third_party') && (
                <div>
                  <Label htmlFor="sourceAgency">
                    {source === 'law_enforcement' ? 'Agency Name' : 'Assessor / Firm Name'}
                  </Label>
                  <Input
                    id="sourceAgency"
                    name="sourceAgency"
                    placeholder={source === 'law_enforcement' ? 'e.g., Springfield Police Department' : 'e.g., SecurePoint Consulting'}
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Supporting Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="vulnerabilityNotes">Why is this facility vulnerable?</Label>
                <AiAssistTextarea
                  id="vulnerabilityNotes"
                  name="vulnerabilityNotes"
                  fieldLabel="Why is this facility vulnerable?"
                  context={aiContext}
                  placeholder="Describe the specific conditions that make this threat more likely or impactful here..."
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">This text feeds directly into your vulnerability narrative.</p>
              </div>
              <div>
                <Label htmlFor="incidentHistory">Incident History</Label>
                <AiAssistTextarea
                  id="incidentHistory"
                  name="incidentHistory"
                  fieldLabel="Incident History"
                  context={aiContext}
                  placeholder="Describe any prior incidents, near-misses, or reports related to this threat..."
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">Prior incidents significantly strengthen a grant application.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Add Threat Assessment'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/sites/${id}/threats`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
