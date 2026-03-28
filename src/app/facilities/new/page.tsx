'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createFacility } from '@/actions/facilities'
import { getOrganizations } from '@/actions/organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { toast } from 'sonner'
import Link from 'next/link'
import { Suspense } from 'react'

function NewFacilityForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultOrgId = searchParams.get('organizationId') || ''
  const [loading, setLoading] = useState(false)
  const [orgId, setOrgId] = useState(defaultOrgId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [organizations, setOrganizations] = useState<any[]>([])

  useEffect(() => {
    getOrganizations().then((r) => {
      if (r.success && r.data) setOrganizations(r.data)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!orgId) { toast.error('Please select an organization'); return }
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await createFacility({
      organizationId: orgId,
      facilityName: formData.get('facilityName') as string,
      address: formData.get('address') as string || undefined,
      occupancyNotes: formData.get('occupancyNotes') as string || undefined,
      populationServed: formData.get('populationServed') as string || undefined,
      daysHoursOfOperation: formData.get('daysHoursOfOperation') as string || undefined,
      childrensAreasNotes: formData.get('childrensAreasNotes') as string || undefined,
      parkingLotNotes: formData.get('parkingLotNotes') as string || undefined,
      surroundingAreaNotes: formData.get('surroundingAreaNotes') as string || undefined,
      publicAccessNotes: formData.get('publicAccessNotes') as string || undefined,
      knownSecurityConcerns: formData.get('knownSecurityConcerns') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    })

    if (result.success && result.data) {
      toast.success('Facility created')
      router.push(`/facilities/${result.data.id}`)
    } else {
      toast.error(result.error || 'Failed to create facility')
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader
        title="Add Facility"
        description="Document a facility for which you are requesting security grant funding."
      />

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>Organization *</Label>
              <Select value={orgId} onValueChange={(v) => setOrgId(v || '')}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select organization..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="facilityName">Facility Name *</Label>
              <Input id="facilityName" name="facilityName" required placeholder="Main Sanctuary Building" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" placeholder="123 Church Lane" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Occupancy & Operations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="populationServed">Population Served</Label>
              <Input id="populationServed" name="populationServed" placeholder="e.g., 400 weekly worship attendees, daycare with 60 children" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Describe who uses this facility. Specific numbers strengthen the grant narrative.</p>
            </div>
            <div>
              <Label htmlFor="daysHoursOfOperation">Days / Hours of Operation</Label>
              <Input id="daysHoursOfOperation" name="daysHoursOfOperation" placeholder="Mon–Fri 8am–6pm; Sun 8am–1pm" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="occupancyNotes">Occupancy Notes</Label>
              <Textarea id="occupancyNotes" name="occupancyNotes" placeholder="Note peak occupancy times, special events, etc." className="mt-1" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Site Characteristics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="childrensAreasNotes">Children&apos;s Areas</Label>
              <Textarea id="childrensAreasNotes" name="childrensAreasNotes" placeholder="Describe daycare, nursery, after-school program areas and their security needs." className="mt-1" rows={2} />
            </div>
            <div>
              <Label htmlFor="parkingLotNotes">Parking Lot</Label>
              <Textarea id="parkingLotNotes" name="parkingLotNotes" placeholder="Describe parking area, access points, lighting conditions, known issues." className="mt-1" rows={2} />
            </div>
            <div>
              <Label htmlFor="surroundingAreaNotes">Surrounding Area</Label>
              <Textarea id="surroundingAreaNotes" name="surroundingAreaNotes" placeholder="Describe the neighborhood context: nearby businesses, transit, foot traffic, crime patterns." className="mt-1" rows={2} />
            </div>
            <div>
              <Label htmlFor="publicAccessNotes">Public Access</Label>
              <Textarea id="publicAccessNotes" name="publicAccessNotes" placeholder="How does the public access this facility? Open entry, controlled access, etc." className="mt-1" rows={2} />
            </div>
            <div>
              <Label htmlFor="knownSecurityConcerns">Known Security Concerns</Label>
              <Textarea id="knownSecurityConcerns" name="knownSecurityConcerns" placeholder="List any known threats, incidents, or vulnerabilities already identified by staff." className="mt-1" rows={3} />
              <p className="text-xs text-muted-foreground mt-1">This will appear in your vulnerability narrative. Be specific.</p>
            </div>
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Any other relevant information about this facility." className="mt-1" rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Facility'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/facilities">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewFacilityPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <NewFacilityForm />
    </Suspense>
  )
}
