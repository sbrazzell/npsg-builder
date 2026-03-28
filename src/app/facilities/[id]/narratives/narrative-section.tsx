'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateAndSaveNarrative, updateNarrative, deleteNarrative } from '@/actions/narratives'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Sparkles, Edit2, Save, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface Draft {
  id: string
  editedText: string | null
  generatedText: string | null
  versionNumber: number
}

interface NarrativeSectionProps {
  facilityId: string
  sectionKey: string
  sectionLabel: string
  sectionDescription: string
  draft: Draft | null
}

export function NarrativeSection({
  facilityId,
  sectionKey,
  sectionLabel,
  sectionDescription,
  draft,
}: NarrativeSectionProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editText, setEditText] = useState(draft?.editedText || '')
  const [expanded, setExpanded] = useState(!!draft)

  async function handleGenerate() {
    setGenerating(true)
    const result = await generateAndSaveNarrative(facilityId, sectionKey)
    if (result.success && result.data) {
      toast.success('Narrative generated')
      setEditText(result.data.editedText || '')
      setExpanded(true)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to generate')
    }
    setGenerating(false)
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    const result = await updateNarrative(draft.id, editText)
    if (result.success) {
      toast.success('Saved')
      setEditing(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to save')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!draft) return
    if (!confirm('Delete this narrative draft?')) return
    setDeleting(true)
    const result = await deleteNarrative(draft.id, facilityId)
    if (result.success) {
      toast.success('Deleted')
      setExpanded(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete')
    }
    setDeleting(false)
  }

  const displayText = draft?.editedText || draft?.generatedText || ''

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <CardTitle className="text-base">{sectionLabel}</CardTitle>
            </button>
            {draft && (
              <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                v{draft.versionNumber}
              </span>
            )}
            {!draft && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Not generated
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {draft && !editing && (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(true); setExpanded(true) }}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={generating}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${generating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {!draft && (
              <Button size="sm" onClick={handleGenerate} disabled={generating}>
                <Sparkles className={`h-3.5 w-3.5 mr-1 ${generating ? 'animate-pulse' : ''}`} />
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            )}
            {editing && (
              <>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditText(draft?.editedText || '') }}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground ml-6">{sectionDescription}</p>
      </CardHeader>

      {expanded && draft && (
        <CardContent>
          {editing ? (
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[200px] font-serif text-sm leading-relaxed"
              placeholder="Edit narrative text..."
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{displayText}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
