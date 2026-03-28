import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { calculateRiskScore, getRiskLevel, getRiskBgClass } from '@/lib/scoring'
import { MapPin, Plus, AlertTriangle, FileText, ChevronRight, Building2 } from 'lucide-react'

export default async function FacilitiesPage() {
  const facilities = await prisma.facility.findMany({
    include: {
      organization: true,
      threatAssessments: { select: { likelihood: true, impact: true } },
      projectProposals: { include: { budgetItems: { select: { totalCost: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="p-8">
      <PageHeader
        title="Facilities"
        description="All facilities across all organizations."
        action={
          <Button asChild>
            <Link href="/facilities/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Facility
            </Link>
          </Button>
        }
      />

      {facilities.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No facilities yet"
          description="Add a facility to get started with your security assessment."
          actionLabel="Add Facility"
          actionHref="/facilities/new"
        />
      ) : (
        <div className="grid gap-4">
          {facilities.map((facility) => {
            const maxRiskScore = facility.threatAssessments.reduce((max, t) => {
              const score = calculateRiskScore(t.likelihood, t.impact)
              return score > max ? score : max
            }, 0)
            const riskLevel = maxRiskScore > 0 ? getRiskLevel(maxRiskScore) : null
            const totalBudget = facility.projectProposals.reduce<number>((sum, p) =>
              sum + p.budgetItems.reduce<number>((s, b) => s + b.totalCost, 0), 0)

            return (
              <Link key={facility.id} href={`/facilities/${facility.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="p-2 bg-violet-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{facility.facilityName}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{facility.organization.name}</span>
                        {facility.address && <span>· {facility.address}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {riskLevel && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getRiskBgClass(riskLevel)}`}>
                          {riskLevel}
                        </span>
                      )}
                      {facility.threatAssessments.length > 0 && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {facility.threatAssessments.length}
                        </Badge>
                      )}
                      {facility.projectProposals.length > 0 && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {facility.projectProposals.length}
                        </Badge>
                      )}
                      {totalBudget > 0 && (
                        <Badge variant="secondary">${totalBudget.toLocaleString()}</Badge>
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
  )
}
