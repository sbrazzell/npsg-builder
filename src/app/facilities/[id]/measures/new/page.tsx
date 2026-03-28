'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMeasure } from '@/actions/measures'
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

const CATEGORIES = [
  'Access Control',
  'Video Surveillance (CCTV)',
  'Perimeter Security',
  'Lighting',
  'Alarm Systems',
  'Intercom / Communication',
  'Staffing / Personnel',
  'Policies & Procedures',
  'Training',
  'Signage',
  'Other',
]

export default function NewMeasurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [effectiveness, setEffectiveness] = useState(3)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await createMeasure({
      facilityId: id,
      category: formData.get('category') as string,
      description: formData.get('description') as string || undefined,
      effectivenessRating: effectiveness,
      gapsRemaining: formData.get('gapsRemaining') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    })

    if (result.success) {
      toast.success('Security measure added')
      router.push(`/facilities/${id}/measures`)
    } else {
      toast.error(result.error || 'Failed to add measure')
      setLoading(false)
    }
  }

  const effectivenessLabels = ['', 'Very Low', 'Low', 'Moderate', 'Good', 'Excellent']

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/facilities' },
        { label: 'Facility', href: `/facilities/${id}` },
        { label: 'Security Measures', href: `/facilities/${id}/measures` },
        { label: 'Add Measure' },
      ]} />
      <div className="p-8 max-w-2xl">
        <PageHeader
          title="Add Security Measure"
          description="Document an existing security control or measure at this facility."
        />

        <form onSubmit={handleSubmit}>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Measure Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  name="category"
                  required
                  list="categoryList"
                  placeholder="Select or type a category"
                  className="mt-1"
                />
                <datalist id="categoryList">
                  {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe what is installed/in place and where..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Effectiveness Rating
                <span className="text-sm font-medium text-blue-700">
                  {effectiveness}/5 — {effectivenessLabels[effectiveness]}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">How well does this measure reduce risk given current conditions?</p>
              <input
                type="range"
                min={1}
                max={5}
                value={effectiveness}
                onChange={(e) => setEffectiveness(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Very Low</span>
                <span>Excellent</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Gaps & Notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="gapsRemaining">Gaps Remaining</Label>
                <Textarea
                  id="gapsRemaining"
                  name="gapsRemaining"
                  placeholder="What vulnerabilities or deficiencies remain despite this measure?"
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">This feeds directly into your vulnerability narrative. Be specific about remaining risks.</p>
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Age of equipment, maintenance status, coverage limitations, etc."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Add Security Measure'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/facilities/${id}/measures`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
