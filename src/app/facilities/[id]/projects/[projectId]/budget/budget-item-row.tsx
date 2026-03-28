'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteBudgetItem } from '@/actions/budget'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/scoring'
import { BudgetItem } from '@prisma/client'

export function BudgetItemRow({
  item,
  facilityId,
  projectId,
}: {
  item: BudgetItem
  facilityId: string
  projectId: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Delete "${item.itemName}"?`)) return
    setLoading(true)
    const result = await deleteBudgetItem(item.id)
    if (result.success) {
      toast.success('Item deleted')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete')
      setLoading(false)
    }
  }

  return (
    <tr className="border-b hover:bg-slate-50 transition-colors">
      <td className="p-3">
        <p className="font-medium">{item.itemName}</p>
        {item.justification && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.justification}</p>
        )}
        {item.vendorName && (
          <p className="text-xs text-muted-foreground">{item.vendorName}</p>
        )}
      </td>
      <td className="p-3 text-muted-foreground">{item.category}</td>
      <td className="p-3 text-right">{item.quantity}</td>
      <td className="p-3 text-right">{formatCurrency(item.unitCost)}</td>
      <td className="p-3 text-right font-medium">{formatCurrency(item.totalCost)}</td>
      <td className="p-3">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-red-600"
          onClick={handleDelete}
          disabled={loading}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )
}
