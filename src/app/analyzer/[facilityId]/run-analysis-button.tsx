'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { runGrantAnalysis } from '@/actions/analysis'
import { BarChart2, Loader2 } from 'lucide-react'

interface RunAnalysisButtonProps {
  facilityId: string
}

export function RunAnalysisButton({ facilityId }: RunAnalysisButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await runGrantAnalysis(facilityId)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Analysis failed. Please try again.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleClick}
        disabled={isPending}
        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <BarChart2 className="h-4 w-4" />
            Run Analysis
          </>
        )}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
