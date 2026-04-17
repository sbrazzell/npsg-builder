'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateThreat } from '@/actions/threats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Header } from '@/components/layout/header'
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

export default function EditThreatPage({ params }: { params: Promise<{ id: string; threatId: string }> }) {
  const { id, threatId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [likelihood, setLikelihood] = useState(3)
  const [impact, setImpact] = useState(3)
  const [source, setSource] = useState('self_assessed')
  const [defaults, setDefaults] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/threats/${threatId}`)
      .then((r) => r.json())
      .then((data) => {
        setLikelihood(data.likelihood ?? 3)
        setImpact(data.impact ?? 3)
        setSource(data.source ?? 'self_assessed')
        setDefaults(data)
        setFetching(false)
      })
      .catch(() => {
        toast.error('Failed to load threat')
        setFetching(false)
      })
  }, [threatId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await updateThreat(threatId, {
      facilityId: id,
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
      toast.success('Threat updated')
      router.push(`/facilities/${id}/threats`)
    } else {
      toast.error(result.error || 'Failed to update threat')
      setLoading(false)
    }
  }

  const score = likelihood * impact
  const level = score <= 4 ? 'Low' : score <= 9 ? 'Medium' : score <= 16 ? 'High' : 'Critical'
  const levelColor = score <= 4 ? 'text-green-700 bg-green-50' : score <= 9 ? 'text-yellow-700 bg-yellow-50' : score <= 16 ? 'text-orange-700 bg-orange-50' : 'text-red-700 bg-red-50'

  if (fetching) {
    return (
      <div>
        <Header breadcrumbs={[
          { label: 'Facilities', href: '/facilities' },
          { label: 'Facility', href: `/facilities/${id}` },
          { label: 'Threats', href: `/facilities/${id}/threats` },
          { label: 'Edit' },
        ]} />
        <div className="p-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/facilities' },
        { label: 'Facility', href: `/facilities/${id}` },
        { label: 'Threats', href: `/facilities/${id}/threats` },
        { label: 'Edit Threat' },
      ]} />
      <div className="p-8 max-w-2xl">
        <PageHeader
          title="Edit Threat Assessment"
          description="Update the details for this documented threat."
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
                  defaultValue={defaults.threatType || ''}
                  placeholder="Select or type a threat type"
                  className="mt-1"
                />
                <datalist id="threatTypeList">
                  {THREAT_TYPES.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={defaults.description || ''}
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
              {source === 'law_enforcement' && (
                <div>
                  <Label htmlFor="sourceAgency">Agency Name</Label>
                  <Input
                    id="sourceAgency"
                    name="sourceAgency"
                    defaultValue={defaults.sourceAgency || ''}
                    placeholder="e.g., Springfield Police Department"
                    className="mt-1"
                  />
                </div>
              )}
              {source === 'third_party' && (
                <div>
                  <Label htmlFor="sourceAgency">Assessor / Firm Name</Label>
                  <Input
                    id="sourceAgency"
                    name="sourceAgency"
                    defaultValue={defaults.sourceAgency || ''}
                    placeholder="e.g., SecurePoint Consulting"
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
                <Textarea
                  id="vulnerabilityNotes"
                  name="vulnerabilityNotes"
                  defaultValue={defaults.vulnerabilityNotes || ''}
                  placeholder="Describe the specific conditions that make this threat more likely or impactful here..."
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">This text feeds directly into your vulnerability narrative.</p>
              </div>
              <div>
                <Label htmlFor="incidentHistory">Incident History</Label>
                <Textarea
                  id="incidentHistory"
                  name="incidentHistory"
                  defaultValue={defaults.incidentHistory || ''}
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
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/facilities/${id}/threats`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
