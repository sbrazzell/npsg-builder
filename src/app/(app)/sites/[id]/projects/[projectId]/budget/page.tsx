import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency } from '@/lib/scoring'
import { DollarSign } from 'lucide-react'
import { BudgetItemForm } from './budget-item-form'
import { BudgetItemRow } from './budget-item-row'

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>
}) {
  const { id, projectId } = await params
  const project = await prisma.projectProposal.findUnique({
    where: { id: projectId },
    include: {
      budgetItems: { orderBy: { createdAt: 'asc' } },
      site: { include: { organization: true } },
    },
  })

  if (!project || project.siteId !== id) notFound()

  const totalBudget = project.budgetItems.reduce((s: number, b) => s + b.totalCost, 0)
  const categories = [...new Set(project.budgetItems.map((i) => i.category).filter(Boolean))]

  return (
    <div>
      <Header breadcrumbs={[
        { label: 'Sites', href: '/sites' },
        { label: project.site.siteName, href: `/sites/${id}` },
        { label: 'Projects', href: `/sites/${id}/projects` },
        { label: project.title, href: `/sites/${id}/projects/${projectId}` },
        { label: 'Budget' },
      ]} />
      <div className="p-4 md:p-8">
        <PageHeader
          title="Budget Builder"
          description={`${project.title} — ${project.site.siteName}`}
        />

        {totalBudget > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalBudget)}</p>
                <p className="text-xs text-muted-foreground">Total Requested</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{project.budgetItems.length}</p>
                <p className="text-xs text-muted-foreground">Line Items</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Table */}
          <div className="lg:col-span-2">
            {project.budgetItems.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="No budget items yet"
                description="Add line items for equipment, installation, and other project costs."
              />
            ) : (
              <Card>
                <CardContent className="pt-0 px-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Item</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Qty</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Unit Cost</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                          <th className="p-3 w-12" />
                        </tr>
                      </thead>
                      <tbody>
                        {project.budgetItems.map((item) => (
                          <BudgetItemRow key={item.id} item={item} siteId={id} projectId={projectId} />
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-slate-50">
                          <td colSpan={4} className="p-3 font-semibold text-right">Total</td>
                          <td className="p-3 font-bold text-emerald-700 text-right">{formatCurrency(totalBudget)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add Item Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Budget Item</CardTitle>
              </CardHeader>
              <CardContent>
                <BudgetItemForm projectId={projectId} siteId={id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
