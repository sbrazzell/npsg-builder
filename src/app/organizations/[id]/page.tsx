import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Header } from '@/components/layout/header'
import {
  Building2,
  MapPin,
  Edit,
  Plus,
  Mail,
  Phone,
  User,
  Hash,
  ChevronRight,
  AlertTriangle,
  FileText,
} from 'lucide-react'

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      facilities: {
        include: {
          threatAssessments: true,
          projectProposals: { include: { budgetItems: true } },
        },
      },
    },
  })

  if (!org) notFound()

  const totalThreats = org.facilities.reduce((s, f) => s + f.threatAssessments.length, 0)
  const totalProjects = org.facilities.reduce((s, f) => s + f.projectProposals.length, 0)
  const totalBudget = org.facilities.reduce((sum, f) =>
    sum + f.projectProposals.reduce((s, p) =>
      s + p.budgetItems.reduce((b, item) => b + item.totalCost, 0), 0), 0)

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Organizations', href: '/organizations' },
        { label: org.name },
      ]} />
      <div className="p-8">
        <PageHeader
          title={org.name}
          description={[org.denomination, org.city && org.state && `${org.city}, ${org.state}`].filter(Boolean).join(' · ')}
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/organizations/${org.id}/edit`}>
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href={`/facilities/new?organizationId=${org.id}`}>
                  <Plus className="h-4 w-4 mr-1" /> Add Facility
                </Link>
              </Button>
            </div>
          }
        />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{org.facilities.length}</p>
              <p className="text-xs text-muted-foreground">Facilities</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{totalProjects}</p>
              <p className="text-xs text-muted-foreground">Project Proposals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Org Details */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {org.contactName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{org.contactName}</span>
                </div>
              )}
              {org.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${org.contactEmail}`} className="text-blue-600 hover:underline">{org.contactEmail}</a>
                </div>
              )}
              {org.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{org.contactPhone}</span>
                </div>
              )}
              {org.einOrTaxId && (
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span>EIN: {org.einOrTaxId}</span>
                </div>
              )}
              {org.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>
                    {org.address}
                    {(org.city || org.state) && <><br />{[org.city, org.state, org.zip].filter(Boolean).join(' ')}</>}
                  </span>
                </div>
              )}
              {org.notes && (
                <>
                  <Separator />
                  <p className="text-muted-foreground">{org.notes}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Facilities */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
              Facilities
              <Button asChild size="sm" variant="ghost">
                <Link href={`/facilities/new?organizationId=${org.id}`}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Link>
              </Button>
            </h2>

            {org.facilities.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No facilities yet"
                description="Add facilities to this organization to start building grant applications."
                actionLabel="Add Facility"
                actionHref={`/facilities/new?organizationId=${org.id}`}
              />
            ) : (
              <div className="space-y-3">
                {org.facilities.map((facility) => {
                  const budget = facility.projectProposals.reduce((s, p) =>
                    s + p.budgetItems.reduce((b, item) => b + item.totalCost, 0), 0)
                  return (
                    <Link key={facility.id} href={`/facilities/${facility.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="flex items-center gap-3 py-3">
                          <div className="p-2 bg-violet-50 rounded-lg">
                            <MapPin className="h-4 w-4 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{facility.facilityName}</p>
                            {facility.address && (
                              <p className="text-xs text-muted-foreground truncate">{facility.address}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {facility.threatAssessments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {facility.threatAssessments.length}
                              </span>
                            )}
                            {facility.projectProposals.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {facility.projectProposals.length}
                              </span>
                            )}
                            {budget > 0 && (
                              <Badge variant="secondary">${budget.toLocaleString()}</Badge>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
