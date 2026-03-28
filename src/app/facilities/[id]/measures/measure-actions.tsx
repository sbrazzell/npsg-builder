'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMeasure } from '@/actions/measures'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

export function MeasureActions({ measureId, facilityId }: { measureId: string; facilityId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this security measure?')) return
    setLoading(true)
    const result = await deleteMeasure(measureId, facilityId)
    if (result.success) {
      toast.success('Measure deleted')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete')
      setLoading(false)
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-muted-foreground hover:text-red-600"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
