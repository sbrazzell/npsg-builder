'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject, updateProject } from '@/actions/projects'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2, Edit } from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProjectActions({ project, facilityId }: { project: any; facilityId: string }) {
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [priority, setPriority] = useState(project.priority)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this project and all budget items?')) return
    setDeleting(true)
    const result = await deleteProject(project.id, facilityId)
    if (result.success) {
      toast.success('Project deleted')
      router.push(`/facilities/${facilityId}/projects`)
    } else {
      toast.error(result.error || 'Failed to delete')
      setDeleting(false)
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)
    const result = await updateProject(project.id, {
      facilityId,
      title: formData.get('title') as string,
      category: formData.get('category') as string || undefined,
      problemStatement: formData.get('problemStatement') as string || undefined,
      proposedSolution: formData.get('proposedSolution') as string || undefined,
      riskReductionRationale: formData.get('riskReductionRationale') as string || undefined,
      implementationNotes: formData.get('implementationNotes') as string || undefined,
      priority,
      status: formData.get('status') as string || 'draft',
      notes: formData.get('notes') as string || undefined,
    })
    if (result.success) {
      toast.success('Project updated')
      setEditing(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update')
    }
    setSaving(false)
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        <Edit className="h-4 w-4 mr-1" /> Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600 hover:text-red-700"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="grid gap-4 pt-2">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input id="edit-title" name="title" required defaultValue={project.title} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Input id="edit-category" name="category" defaultValue={project.category || ''} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select id="edit-status" name="status" defaultValue={project.status} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="draft">Draft</option>
                  <option value="review">In Review</option>
                  <option value="submitted">Submitted</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Priority: {priority}/5</Label>
              <input type="range" min={1} max={5} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full mt-1 accent-blue-600" />
            </div>
            <div>
              <Label htmlFor="edit-problem">Problem Statement</Label>
              <Textarea id="edit-problem" name="problemStatement" defaultValue={project.problemStatement || ''} className="mt-1" rows={3} />
            </div>
            <div>
              <Label htmlFor="edit-solution">Proposed Solution</Label>
              <Textarea id="edit-solution" name="proposedSolution" defaultValue={project.proposedSolution || ''} className="mt-1" rows={3} />
            </div>
            <div>
              <Label htmlFor="edit-rationale">Risk Reduction Rationale</Label>
              <Textarea id="edit-rationale" name="riskReductionRationale" defaultValue={project.riskReductionRationale || ''} className="mt-1" rows={3} />
            </div>
            <div>
              <Label htmlFor="edit-implementation">Implementation Notes</Label>
              <Textarea id="edit-implementation" name="implementationNotes" defaultValue={project.implementationNotes || ''} className="mt-1" rows={2} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
