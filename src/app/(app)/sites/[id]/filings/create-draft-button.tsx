'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDraft } from '@/actions/filings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { FilePlus } from 'lucide-react'

export function CreateDraftButton({ siteId, nextVersion }: { siteId: string; nextVersion: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(`Draft v${nextVersion}`)
  const [notes, setNotes] = useState('')

  async function handleCreate() {
    if (!title.trim()) return
    setLoading(true)
    const result = await createDraft(siteId, title.trim(), notes.trim() || undefined)
    if (result.success && result.data) {
      toast.success(`Draft v${nextVersion} saved`)
      setOpen(false)
      router.push(`/sites/${siteId}/filings/${result.data.id}`)
    } else {
      toast.error(result.error || 'Failed to create draft')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <FilePlus className="h-4 w-4 mr-2" /> Save New Draft
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Application Draft</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          This captures a snapshot of all current data — org info, threats, projects, budgets, and narratives — as version {nextVersion}.
        </p>
        <div className="grid gap-4 mt-2">
          <div>
            <Label htmlFor="draftTitle">Title</Label>
            <Input
              id="draftTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              placeholder={`Draft v${nextVersion}`}
            />
          </div>
          <div>
            <Label htmlFor="draftNotes">Notes (optional)</Label>
            <Textarea
              id="draftNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="e.g. Updated budget after vendor quotes received, narratives revised..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !title.trim()}>
            {loading ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
