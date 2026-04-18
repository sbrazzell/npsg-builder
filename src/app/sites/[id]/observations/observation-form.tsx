'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createObservation } from '@/actions/observations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const OBSERVATION_TYPES = [
  'Access Control Gap',
  'Lighting Deficiency',
  'Perimeter Vulnerability',
  'Camera Blind Spot',
  'Physical Damage / Deterioration',
  'Unsafe Condition',
  'Behavioral Concern',
  'Environmental Hazard',
  'Positive Observation',
  'Other',
]

export function ObservationForm({ siteId }: { siteId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [severity, setSeverity] = useState(3)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await createObservation({
      siteId,
      title: formData.get('title') as string,
      locationDescription: formData.get('locationDescription') as string || undefined,
      observationType: formData.get('observationType') as string || undefined,
      severity,
      notes: formData.get('notes') as string || undefined,
    })

    if (result.success) {
      toast.success('Observation recorded')
      router.refresh()
      ;(e.target as HTMLFormElement).reset()
      setSeverity(3)
    } else {
      toast.error(result.error || 'Failed to save')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required placeholder="Unlit north parking lot" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="observationType">Type</Label>
        <Input id="observationType" name="observationType" list="typeList" placeholder="Select type" className="mt-1" />
        <datalist id="typeList">
          {OBSERVATION_TYPES.map((t) => <option key={t} value={t} />)}
        </datalist>
      </div>
      <div>
        <Label htmlFor="locationDescription">Location</Label>
        <Input id="locationDescription" name="locationDescription" placeholder="North parking lot, Gate 2" className="mt-1" />
      </div>
      <div>
        <Label>Severity: {severity}/5</Label>
        <input
          type="range"
          min={1}
          max={5}
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
          className="w-full mt-1 accent-blue-600"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Minor</span>
          <span>Critical</span>
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Detailed observation notes..." className="mt-1" rows={3} />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving...' : 'Record Observation'}
      </Button>
    </form>
  )
}
