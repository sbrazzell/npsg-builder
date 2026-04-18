'use client'

import { useState, useTransition } from 'react'
import { applyNarrativeRewrite } from '@/actions/narratives'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ApplyNarrativeRewriteButtonProps {
  narrativeId: string
  rewriteText: string
}

export function ApplyNarrativeRewriteButton({ narrativeId, rewriteText }: ApplyNarrativeRewriteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [applied, setApplied] = useState(false)

  function handleApply() {
    startTransition(async () => {
      const result = await applyNarrativeRewrite(narrativeId, rewriteText)
      if (result.success) {
        setApplied(true)
        toast.success('Rewrite applied')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to apply rewrite')
      }
    })
  }

  if (applied) {
    return (
      <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
        <CheckCircle className="h-4 w-4" />
        Rewrite applied
      </div>
    )
  }

  return (
    <Button
      onClick={handleApply}
      disabled={isPending}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      {isPending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Applying...
        </>
      ) : (
        <>
          <Wand2 className="h-3.5 w-3.5" />
          Apply Rewrite
        </>
      )}
    </Button>
  )
}
