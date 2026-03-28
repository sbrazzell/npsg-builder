'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFacility, updateFacility, deleteFacility } from '@/actions/facilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { Header } from '@/components/layout/header'
import { toast } from 'sonner'
import Link from 'next/link'
import { use } from 'react'

export default function EditFacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [facility, setFacility] = useState<any>(null)

  useEffect(() => {
    getFacility(id).then((r) => {
      if (r.success) setFacility(r.data)
    })
  }, [id])

  if (!facility) return <div className="p-8 text-muted-foreground">Loading...</div>

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await updateFacility(id, {
      organizationId: facility.organizationId,
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

    if (result.success) {
      toast.success('Facility updated')
      router.push(`/facilities/${id}`)
    } else {
      toast.error(result.error || 'Failed to update facility')
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this facility and all associated data? This cannot be undone.')) return
    setDeleting(true)
    const result = await deleteFacility(id)
    if (result.success) {
      toast.success('Facility deleted')
      router.push('/facilities')
    } else {
      toast.error(result.error || 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Facilities', href: '/facilities' },
        { label: facility.facilityName, href: `/facilities/${id}` },
        { label: 'Edit' },
      ]} />
      <div className="p-8 max-w-2xl">
        <PageHeader title="Edit Facility" />

        <form onSubmit={handleSubmit}>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="facilityName">Facility Name *</Label>
                <Input id="facilityName" name="facilityName" required defaultValue={facility.facilityName} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={facility.address || ''} className="mt-1" />
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
                <Input id="populationServed" name="populationServed" defaultValue={facility.populationServed || ''} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="daysHoursOfOperation">Days / Hours of Operation</Label>
                <Input id="daysHoursOfOperation" name="daysHoursOfOperation" defaultValue={facility.daysHoursOfOperation || ''} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="occupancyNotes">Occupancy Notes</Label>
                <Textarea id="occupancyNotes" name="occupancyNotes" defaultValue={facility.occupancyNotes || ''} className="mt-1" rows={2} />
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
                <Textarea id="childrensAreasNotes" name="childrensAreasNotes" defaultValue={facility.childrensAreasNotes || ''} className="mt-1" rows={2} />
              </div>
              <div>
                <Label htmlFor="parkingLotNotes">Parking Lot</Label>
                <Textarea id="parkingLotNotes" name="parkingLotNotes" defaultValue={facility.parkingLotNotes || ''} className="mt-1" rows={2} />
              </div>
              <div>
                <Label htmlFor="surroundingAreaNotes">Surrounding Area</Label>
                <Textarea id="surroundingAreaNotes" name="surroundingAreaNotes" defaultValue={facility.surroundingAreaNotes || ''} className="mt-1" rows={2} />
              </div>
              <div>
                <Label htmlFor="publicAccessNotes">Public Access</Label>
                <Textarea id="publicAccessNotes" name="publicAccessNotes" defaultValue={facility.publicAccessNotes || ''} className="mt-1" rows={2} />
              </div>
              <div>
                <Label htmlFor="knownSecurityConcerns">Known Security Concerns</Label>
                <Textarea id="knownSecurityConcerns" name="knownSecurityConcerns" defaultValue={facility.knownSecurityConcerns || ''} className="mt-1" rows={3} />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={facility.notes || ''} className="mt-1" rows={2} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/facilities/${id}`}>Cancel</Link>
            </Button>
          </div>
        </form>

        <Separator className="my-8" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Danger Zone</h3>
          <p className="text-xs text-red-700 mb-3">Deleting this facility will permanently remove all threats, projects, budget items, and narratives.</p>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Facility'}
          </Button>
        </div>
      </div>
    </div>
  )
}
