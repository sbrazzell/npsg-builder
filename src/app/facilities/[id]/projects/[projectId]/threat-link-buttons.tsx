'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { linkThreatToProject, unlinkThreatFromProject } from '@/actions/projects'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

interface Threat {
  id: string
  threatType: string
}

export function ThreatLinkButtons({
  projectId,
  facilityId,
  unlinkedThreats,
}: {
  projectId: string
  facilityId: string
  unlinkedThreats: Threat[]
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleLink(threatId: string) {
    setLoading(threatId)
    const result = await linkThreatToProject(projectId, threatId)
    if (result.success) {
      toast.success('Threat linked')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to link')
    }
    setLoading(null)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {unlinkedThreats.map((threat) => (
        <Button
          key={threat.id}
          size="sm"
          variant="outline"
          className="text-xs h-7"
          disabled={loading === threat.id}
          onClick={() => handleLink(threat.id)}
        >
          <Plus className="h-3 w-3 mr-1" />
          {threat.threatType.length > 30 ? threat.threatType.slice(0, 30) + '…' : threat.threatType}
        </Button>
      ))}
    </div>
  )
}
