'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDraft, updateDraftStatus } from '@/actions/filings'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle2, Trash2, RotateCcw } from 'lucide-react'

export function DraftActions({
  draftId,
  facilityId,
  status,
}: {
  draftId: string
  facilityId: string
  status: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleFinalize() {
    if (!confirm('Mark this draft as Final? Any previously finalized draft will be demoted back to draft status.')) return
    setLoading(true)
    const result = await updateDraftStatus(draftId, 'final')
    if (result.success) {
      toast.success('Marked as Final')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update')
      setLoading(false)
    }
  }

  async function handleDemote() {
    setLoading(true)
    const result = await updateDraftStatus(draftId, 'draft')
    if (result.success) {
      toast.success('Reverted to Draft')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update')
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this draft? This cannot be undone.')) return
    setLoading(true)
    const result = await deleteDraft(draftId)
    if (result.success) {
      toast.success('Draft deleted')
      router.push(`/facilities/${facilityId}/filings`)
    } else {
      toast.error(result.error || 'Failed to delete')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {status !== 'final' ? (
        <Button
          size="sm" variant="outline"
          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          onClick={handleFinalize} disabled={loading}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Final
        </Button>
      ) : (
        <Button
          size="sm" variant="outline"
          className="text-amber-700 border-amber-200 hover:bg-amber-50"
          onClick={handleDemote} disabled={loading}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Revert to Draft
        </Button>
      )}
      <Button
        size="icon" variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-red-600"
        onClick={handleDelete} disabled={loading}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
