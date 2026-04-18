'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganization } from '@/actions/organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { toast } from 'sonner'
import Link from 'next/link'

export default function NewOrganizationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await createOrganization({
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

    if (result.success && result.data) {
      toast.success('Organization created')
      router.push(`/organizations/${result.data.id}`)
    } else {
      toast.error(result.error || 'Failed to create organization')
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader
        title="Add Organization"
        description="Create a new organization to associate sites and grant applications with."
      />

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="name">Organization Name *</Label>
              <Input id="name" name="name" required placeholder="Grace Community Church" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="denomination">Denomination / Type</Label>
              <Input id="denomination" name="denomination" placeholder="e.g., Baptist, Catholic, Non-denominational" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Optional. Helps categorize the organization.</p>
            </div>
            <div>
              <Label htmlFor="einOrTaxId">EIN / Tax ID</Label>
              <Input id="einOrTaxId" name="einOrTaxId" placeholder="12-3456789" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Federal Employer Identification Number, required for grant applications.</p>
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
              <Input id="address" name="address" placeholder="123 Main Street" className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="Springfield" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" placeholder="IL" maxLength={2} className="mt-1" />
              </div>
            </div>
            <div className="w-32">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" name="zip" placeholder="62701" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" name="contactName" placeholder="John Smith" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" placeholder="john@church.org" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input id="contactPhone" name="contactPhone" placeholder="(555) 555-5555" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Any additional notes about this organization..." className="mt-1" rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Organization'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/organizations">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
