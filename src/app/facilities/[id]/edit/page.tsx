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
      lawEnforcementAgency: formData.get('lawEnforcementAgency') as string || undefined,
      lawEnforcementContactName: formData.get('lawEnforcementContactName') as string || undefined,
      lawEnforcementContactDate: formData.get('lawEnforcementContactDate') as string || undefined,
      lawEnforcementResponseDate: formData.get('lawEnforcementResponseDate') as string || undefined,
      lawEnforcementFindings: formData.get('lawEnforcementFindings') as string || undefined,
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

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                🚔 Law Enforcement Threat Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                <strong>NSGP tip:</strong> Reaching out to your local Police or Sheriff&apos;s Department for a threat assessment strengthens your application. Document that outreach here once completed.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lawEnforcementAgency">Agency Name</Label>
                  <Input
                    id="lawEnforcementAgency"
                    name="lawEnforcementAgency"
                    defaultValue={facility.lawEnforcementAgency || ''}
                    placeholder="e.g., Springfield Police Dept."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lawEnforcementContactName">Officer / Contact Name</Label>
                  <Input
                    id="lawEnforcementContactName"
                    name="lawEnforcementContactName"
                    defaultValue={facility.lawEnforcementContactName || ''}
                    placeholder="Name of officer or liaison"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lawEnforcementContactDate">Date Requested</Label>
                  <Input
                    id="lawEnforcementContactDate"
                    name="lawEnforcementContactDate"
                    type="date"
                    defaultValue={facility.lawEnforcementContactDate
                      ? new Date(facility.lawEnforcementContactDate).toISOString().split('T')[0]
                      : ''}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lawEnforcementResponseDate">Date Assessment Received</Label>
                  <Input
                    id="lawEnforcementResponseDate"
                    name="lawEnforcementResponseDate"
                    type="date"
                    defaultValue={facility.lawEnforcementResponseDate
                      ? new Date(facility.lawEnforcementResponseDate).toISOString().split('T')[0]
                      : ''}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="lawEnforcementFindings">Key Findings / Summary</Label>
                <Textarea
                  id="lawEnforcementFindings"
                  name="lawEnforcementFindings"
                  defaultValue={facility.lawEnforcementFindings || ''}
                  placeholder="Summarize the threats or vulnerabilities identified by law enforcement..."
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  These findings can be cited in your Threat Overview narrative and give FEMA reviewers confidence in your risk assessment.
                </p>
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
