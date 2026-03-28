import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Building2, Plus, MapPin, ChevronRight } from 'lucide-react'

export default async function OrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    include: { facilities: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-8">
      <PageHeader
        title="Organizations"
        description="Manage the organizations you are building grant applications for."
        action={
          <Button asChild>
            <Link href="/organizations/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Link>
          </Button>
        }
      />

      {organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Add your first organization to start building a grant application."
          actionLabel="Add Organization"
          actionHref="/organizations/new"
        />
      ) : (
        <div className="grid gap-4">
          {organizations.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{org.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                      {org.denomination && <span>{org.denomination}</span>}
                      {org.city && org.state && (
                        <span>{org.city}, {org.state}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {org.facilities.length} {org.facilities.length === 1 ? 'facility' : 'facilities'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
