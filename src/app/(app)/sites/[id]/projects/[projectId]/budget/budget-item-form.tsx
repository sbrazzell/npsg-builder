'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBudgetItem } from '@/actions/budget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const BUDGET_CATEGORIES = [
  'Equipment',
  'Installation / Labor',
  'Software / Licensing',
  'Infrastructure',
  'Training',
  'Professional Services',
  'Maintenance / Support',
  'Other',
]

export function BudgetItemForm({ projectId, siteId }: { projectId: string; siteId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [qty, setQty] = useState(1)
  const [unitCost, setUnitCost] = useState(0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await createBudgetItem({
      projectId,
      itemName: formData.get('itemName') as string,
      category: formData.get('category') as string || undefined,
      quantity: qty,
      unitCost,
      totalCost: qty * unitCost,
      vendorName: formData.get('vendorName') as string || undefined,
      vendorUrl: formData.get('vendorUrl') as string || undefined,
      justification: formData.get('justification') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    })

    if (result.success) {
      toast.success('Budget item added')
      router.refresh()
      ;(e.target as HTMLFormElement).reset()
      setQty(1)
      setUnitCost(0)
    } else {
      toast.error(result.error || 'Failed to add item')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div>
        <Label htmlFor="itemName">Item Name *</Label>
        <Input id="itemName" name="itemName" required placeholder="IP Security Camera" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" list="catList" placeholder="Equipment" className="mt-1" />
        <datalist id="catList">
          {BUDGET_CATEGORIES.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="qty">Qty</Label>
          <Input
            id="qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="unitCost">Unit Cost ($)</Label>
          <Input
            id="unitCost"
            type="number"
            min={0}
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(Number(e.target.value))}
            className="mt-1"
          />
        </div>
      </div>
      <div className="text-sm font-medium text-emerald-700 text-right">
        Total: ${(qty * unitCost).toLocaleString()}
      </div>
      <div>
        <Label htmlFor="vendorName">Vendor Name</Label>
        <Input id="vendorName" name="vendorName" placeholder="Axis Communications" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="justification">Justification</Label>
        <Textarea
          id="justification"
          name="justification"
          placeholder="Why is this item necessary?"
          className="mt-1"
          rows={2}
        />
        <p className="text-xs text-muted-foreground mt-1">Required for grant defensibility.</p>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Adding...' : 'Add Item'}
      </Button>
    </form>
  )
}
