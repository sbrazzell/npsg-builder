'use client'

import { useState, useTransition } from 'react'
import { applyGeneratedRewrite } from '@/actions/narratives'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, Wand2 } from 'lucide-react'
import Link from 'next/link'

interface ApplyRewriteButtonProps {
  facilityId: string
  sectionName: string
  rewriteText: string
}

export function ApplyRewriteButton({ facilityId, sectionName, rewriteText }: ApplyRewriteButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [applied, setApplied] = useState(false)

  function handleApply() {
    startTransition(async () => {
      const result = await applyGeneratedRewrite(facilityId, sectionName, rewriteText)
      if (result.success) setApplied(true)
    })
  }

  if (applied) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          Applied to Narrative Studio
        </div>
        <Link
          href={`/facilities/${facilityId}/narratives`}
          className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
        >
          View in Narrative Studio &rarr;
        </Link>
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
