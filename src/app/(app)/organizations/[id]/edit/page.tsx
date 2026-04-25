'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getOrganization, updateOrganization, deleteOrganization } from '@/actions/organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Header } from '@/components/layout/header'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import Link from 'next/link'
import { use } from 'react'

export default function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [org, setOrg] = useState<any>(null)

  useEffect(() => {
    getOrganization(id).then((result) => {
      if (result.success) setOrg(result.data)
    })
  }, [id])

  if (!org) return <div className="p-8 text-muted-foreground">Loading...</div>

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await updateOrganization(id, {
      name: formData.get('name') as string,
      denomination: formData.get('denomination') as string || undefined,
      address: formData.get('address') as string || undefined,
      city: formData.get('city') as string || undefined,
      state: formData.get('state') as string || undefined,
      zip: formData.get('zip') as string || undefined,
      contactName: formData.get('contactName') as string || undefined,
      contactEmail: formData.get('contactEmail') as string || undefined,
      contactPhone: formData.get('contactPhone') as string || undefined,
      einOrTaxId: formData.get('einOrTaxId') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    })

    if (result.success) {
      toast.success('Organization updated')
      router.push(`/organizations/${id}`)
    } else {
      toast.error(result.error || 'Failed to update organization')
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this organization and all its sites? This cannot be undone.')) return
    setDeleting(true)
    const result = await deleteOrganization(id)
    if (result.success) {
      toast.success('Organization deleted')
      router.push('/organizations')
    } else {
      toast.error(result.error || 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Organizations', href: '/organizations' },
        { label: org.name, href: `/organizations/${id}` },
        { label: 'Edit' },
      ]} />
      <div className="p-8 max-w-2xl">
        <PageHeader title="Edit Organization" />

        <form onSubmit={handleSubmit}>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="name">Organization Name *</Label>
                <Input id="name" name="name" required defaultValue={org.name} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="denomination">Denomination / Type</Label>
                <Input id="denomination" name="denomination" defaultValue={org.denomination || ''} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="einOrTaxId">EIN / Tax ID</Label>
                <Input id="einOrTaxId" name="einOrTaxId" defaultValue={org.einOrTaxId || ''} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" name="address" defaultValue={org.address || ''} className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" defaultValue={org.city || ''} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" defaultValue={org.state || ''} maxLength={2} className="mt-1" />
                </div>
              </div>
              <div className="w-32">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input id="zip" name="zip" defaultValue={org.zip || ''} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name</Label>
                <Input id="contactName" name="contactName" defaultValue={org.contactName || ''} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={org.contactEmail || ''} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input id="contactPhone" name="contactPhone" defaultValue={org.contactPhone || ''} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={org.notes || ''} className="mt-1" rows={3} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/organizations/${id}`}>Cancel</Link>
            </Button>
          </div>
        </form>

        <Separator className="my-8" />

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Danger Zone</h3>
          <p className="text-xs text-red-700 mb-3">Deleting this organization will permanently remove all associated sites, threats, projects, and budget items.</p>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </div>
      </div>
    </div>
  )
}
