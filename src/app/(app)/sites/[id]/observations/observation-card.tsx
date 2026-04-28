'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteObservation, updateObservation } from '@/actions/observations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { getRiskBgClass } from '@/lib/scoring'
import { toast } from 'sonner'
import { Trash2, Pencil, X, Check, MapPin } from 'lucide-react'

const OBSERVATION_TYPES = [
  'Access Control Gap',
  'Lighting Deficiency',
  'Perimeter Vulnerability',
  'Camera Blind Spot',
  'Physical Damage / Deterioration',
  'Unsafe Condition',
  'Behavioral Concern',
  'Environmental Hazard',
  'Positive Observation',
  'Other',
]

interface Observation {
  id: string
  siteId: string
  title: string
  locationDescription: string | null
  observationType: string | null
  severity: number
  notes: string | null
}

export function ObservationCard({ obs, siteId }: { obs: Observation; siteId: string }) {
  const [editing, setEditing]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [severity, setSeverity] = useState(obs.severity)
  const router = useRouter()

  const sevLevel = obs.severity <= 2 ? 'low' : obs.severity <= 3 ? 'medium' : obs.severity <= 4 ? 'high' : 'critical'

  async function handleDelete() {
    if (!confirm('Delete this observation?')) return
    setDeleting(true)
    const result = await deleteObservation(obs.id, siteId)
    if (result.success) {
      toast.success('Observation deleted')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete')
      setDeleting(false)
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)

    const result = await updateObservation(obs.id, {
      siteId,
      title:               formData.get('title') as string,
      locationDescription: (formData.get('locationDescription') as string) || undefined,
      observationType:     (formData.get('observationType') as string) || undefined,
      severity,
      notes:               (formData.get('notes') as string) || undefined,
    })

    if (result.success) {
      toast.success('Observation updated')
      setEditing(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update')
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {editing ? (
          /* ── Edit form — full card width ── */
          <form onSubmit={handleSave} className="grid gap-3">
            <div>
              <Label htmlFor={`edit-title-${obs.id}`}>Title *</Label>
              <Input
                id={`edit-title-${obs.id}`}
                name="title"
                required
                defaultValue={obs.title}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`edit-type-${obs.id}`}>Type</Label>
              <Input
                id={`edit-type-${obs.id}`}
                name="observationType"
                list={`typeList-${obs.id}`}
                defaultValue={obs.observationType ?? ''}
                className="mt-1"
              />
              <datalist id={`typeList-${obs.id}`}>
                {OBSERVATION_TYPES.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <Label htmlFor={`edit-location-${obs.id}`}>Location</Label>
              <Input
                id={`edit-location-${obs.id}`}
                name="locationDescription"
                defaultValue={obs.locationDescription ?? ''}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Severity: {severity}/5</Label>
              <input
                type="range"
                min={1}
                max={5}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full mt-1 accent-blue-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minor</span>
                <span>Critical</span>
              </div>
            </div>
            <div>
              <Label htmlFor={`edit-notes-${obs.id}`}>Notes</Label>
              <Textarea
                id={`edit-notes-${obs.id}`}
                name="notes"
                defaultValue={obs.notes ?? ''}
                className="mt-1"
                rows={5}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => { setEditing(false); setSeverity(obs.severity) }}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          /* ── View mode ── */
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-gray-900">{obs.title}</h3>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getRiskBgClass(sevLevel)}`}>
                  Severity {obs.severity}/5
                </span>
              </div>
              {obs.observationType && (
                <p className="text-xs text-muted-foreground mb-1">{obs.observationType}</p>
              )}
              {obs.locationDescription && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {obs.locationDescription}
                </p>
              )}
              {obs.notes && (
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{obs.notes}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                onClick={() => setEditing(true)}
                disabled={deleting}
                title="Edit observation"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete observation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
