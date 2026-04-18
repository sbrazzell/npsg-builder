'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteThreat } from '@/actions/threats'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

export function ThreatActions({ threatId, siteId }: { threatId: string; siteId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this threat assessment? This cannot be undone.')) return
    setLoading(true)
    const result = await deleteThreat(threatId, siteId)
    if (result.success) {
      toast.success('Threat deleted')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-blue-600"
        asChild
      >
        <Link href={`/sites/${siteId}/threats/${threatId}/edit`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-red-600"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
