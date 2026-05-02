'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateThreat, deleteThreat, toggleThreatIncluded, moveThreatToSite } from '@/actions/threats'
import { MoveToSiteButton, type SiblingSite } from '@/components/shared/move-to-site-button'
import { calculateRiskScore, getRiskLevel } from '@/lib/scoring'
import { FilingToggle } from '@/components/shared/filing-toggle'
import { DragHandle } from '@/components/shared/sortable-list'
import { AiAssistTextarea } from '@/components/shared/ai-assist-textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { THREAT_SOURCES } from '@/lib/validations'
import { toast } from 'sonner'
import { Trash2, Pencil, X, Check, BadgeCheck, FileText, ShieldAlert } from 'lucide-react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'

const THREAT_TYPES = [
  'Active Shooter / Armed Assault',
  'Targeted Violence / Hate Crime',
  'Bomb Threat / Explosive Device',
  'Unauthorized Entry / Intrusion',
  'Vandalism / Property Damage',
  'Theft / Burglary',
  'Harassment / Stalking',
  'Domestic Violence Spillover',
  'Protest / Civil Unrest',
  'Natural Disaster',
  'Fire / Arson',
  'Cyber Attack',
]

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'var(--bad-wash)',  text: 'var(--risk-critical)', border: 'var(--risk-critical)' },
  high:     { bg: '#fef3ec',          text: 'var(--risk-high)',     border: 'var(--risk-high)' },
  medium:   { bg: '#fefce8',          text: 'var(--risk-med)',      border: 'var(--risk-med)' },
  low:      { bg: '#f0fdf4',          text: 'var(--risk-low)',      border: 'var(--risk-low)' },
}

const DOT_COLORS: Record<string, string> = {
  critical: 'var(--risk-critical)',
  high:     'var(--risk-high)',
  medium:   'var(--risk-med)',
  low:      'var(--risk-low)',
}

export interface Threat {
  id: string
  threatType: string
  description: string | null
  likelihood: number
  impact: number
  source: string
  sourceAgency: string | null
  vulnerabilityNotes: string | null
  incidentHistory: string | null
  includedInFiling: boolean
  sortOrder: number
}

export function ThreatCard({
  threat,
  siteId,
  index,
  dragHandleProps,
  siblingSites = [],
}: {
  threat: Threat
  siteId: string
  index: number
  dragHandleProps?: { listeners?: DraggableSyntheticListeners; attributes?: DraggableAttributes }
  siblingSites?: SiblingSite[]
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [likelihood, setLikelihood] = useState(threat.likelihood)
  const [impact, setImpact]         = useState(threat.impact)
  const [source, setSource]         = useState(threat.source)
  const router = useRouter()

  const riskScore = calculateRiskScore(threat.likelihood, threat.impact)
  const riskLevel = getRiskLevel(riskScore)
  const rc = RISK_COLORS[riskLevel] ?? RISK_COLORS.low
  const dotColor = DOT_COLORS[riskLevel] ?? 'var(--ink-4)'

  // Live score during edit
  const editScore = likelihood * impact
  const editLevel = getRiskLevel(editScore)
  const editRc = RISK_COLORS[editLevel] ?? RISK_COLORS.low

  async function handleDelete() {
    if (!confirm('Delete this threat? This cannot be undone.')) return
    setDeleting(true)
    const result = await deleteThreat(threat.id, siteId)
    if (result.success) {
      toast.success('Threat deleted')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete')
      setDeleting(false)
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)

    const result = await updateThreat(threat.id, {
      siteId,
      threatType:         fd.get('threatType') as string,
      description:        (fd.get('description') as string) || undefined,
      likelihood,
      impact,
      source,
      sourceAgency:       (fd.get('sourceAgency') as string) || undefined,
      vulnerabilityNotes: (fd.get('vulnerabilityNotes') as string) || undefined,
      incidentHistory:    (fd.get('incidentHistory') as string) || undefined,
    })

    if (result.success) {
      toast.success('Threat updated')
      setEditing(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update')
    }
    setSaving(false)
  }

  function cancelEdit() {
    setEditing(false)
    setLikelihood(threat.likelihood)
    setImpact(threat.impact)
    setSource(threat.source)
  }

  const sourceLabel = THREAT_SOURCES.find(s => s.value === source)?.label

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div
        className="border-b px-3 py-3"
        style={{ borderColor: 'var(--rule-2)', background: 'var(--paper)' }}
      >
        <form onSubmit={handleSave} className="space-y-3">

          {/* Threat type */}
          <div>
            <Label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
              Threat Type *
            </Label>
            <Input
              name="threatType"
              required
              list={`threatTypeList-${threat.id}`}
              defaultValue={threat.threatType}
              className="mt-0.5 h-8 text-[13px]"
            />
            <datalist id={`threatTypeList-${threat.id}`}>
              {THREAT_TYPES.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          {/* Description */}
          <div>
            <Label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
              Description
            </Label>
            <AiAssistTextarea
              name="description"
              fieldLabel="Description"
              context={{ 'Threat Type': threat.threatType, 'Likelihood': `${likelihood}/5`, 'Impact': `${impact}/5` }}
              initialValue={threat.description ?? ''}
              placeholder="How this threat manifests at this site…"
              className="mt-0.5 text-[13px]"
              rows={2}
            />
          </div>

          {/* Likelihood + Impact sliders */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
                Likelihood: <span className="font-bold" style={{ color: 'var(--ink)' }}>{likelihood}/5</span>
              </Label>
              <input
                type="range" min={1} max={5}
                value={likelihood}
                onChange={e => setLikelihood(Number(e.target.value))}
                className="w-full mt-1 accent-blue-600"
              />
              <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
                <span>Unlikely</span><span>Certain</span>
              </div>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
                Impact: <span className="font-bold" style={{ color: 'var(--ink)' }}>{impact}/5</span>
              </Label>
              <input
                type="range" min={1} max={5}
                value={impact}
                onChange={e => setImpact(Number(e.target.value))}
                className="w-full mt-1 accent-blue-600"
              />
              <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
                <span>Minimal</span><span>Catastrophic</span>
              </div>
            </div>
          </div>

          {/* Live risk score badge */}
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-semibold border"
            style={{ background: editRc.bg, color: editRc.text, borderColor: editRc.border }}
          >
            {editLevel.charAt(0).toUpperCase() + editLevel.slice(1)} · {editScore}/25
          </div>

          {/* Source */}
          <div>
            <Label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
              Source
            </Label>
            <select
              name="source"
              value={source}
              onChange={e => setSource(e.target.value)}
              className="mt-0.5 flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {THREAT_SOURCES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {(source === 'law_enforcement' || source === 'third_party') && (
            <div>
              <Label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
                {source === 'law_enforcement' ? 'Agency Name' : 'Assessor / Firm'}
              </Label>
              <Input
                name="sourceAgency"
                defaultValue={threat.sourceAgency ?? ''}
                placeholder={source === 'law_enforcement' ? 'e.g., Springfield Police Dept.' : 'e.g., SecurePoint Consulting'}
                className="mt-0.5 h-8 text-[13px]"
              />
            </div>
          )}

          {/* Vulnerability notes */}
          <div>
            <Label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
              Why is this site vulnerable?
            </Label>
            <AiAssistTextarea
              name="vulnerabilityNotes"
              fieldLabel="Vulnerability Notes"
              context={{ 'Threat Type': threat.threatType, 'Likelihood': `${likelihood}/5`, 'Impact': `${impact}/5` }}
              initialValue={threat.vulnerabilityNotes ?? ''}
              placeholder="Specific conditions that increase exposure to this threat…"
              className="mt-0.5 text-[13px]"
              rows={2}
            />
          </div>

          {/* Incident history */}
          <div>
            <Label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
              Incident History
            </Label>
            <AiAssistTextarea
              name="incidentHistory"
              fieldLabel="Incident History"
              context={{ 'Threat Type': threat.threatType }}
              initialValue={threat.incidentHistory ?? ''}
              placeholder="Prior incidents, near-misses, or reports…"
              className="mt-0.5 text-[13px]"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={saving} className="h-7 text-[12px] px-3">
              <Check className="h-3.5 w-3.5 mr-1" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={saving} className="h-7 text-[12px] px-3">
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        </form>
      </div>
    )
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <div
      className="border-b px-3 py-3 flex gap-2.5"
      style={{
        borderColor: 'var(--rule-2)',
        background: threat.includedInFiling ? undefined : 'var(--paper-2)',
        opacity: threat.includedInFiling ? 1 : 0.65,
      }}
    >
      {/* Drag handle */}
      {dragHandleProps && <DragHandle {...dragHandleProps} />}

      {/* Risk dot */}
      <div
        className="w-[22px] h-[22px] rounded-full flex items-center justify-center font-serif font-semibold text-white flex-shrink-0 mt-0.5"
        style={{ fontSize: '11px', background: dotColor }}
      >
        {index}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">

        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-[13px] leading-snug" style={{ color: 'var(--ink)' }}>
            {threat.threatType}
          </p>
          {/* Edit / Delete / Move */}
          <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
            <MoveToSiteButton
              itemId={threat.id}
              sourceSiteId={siteId}
              siblingSites={siblingSites}
              onMove={moveThreatToSite}
              label="Move threat to another site"
            />
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={deleting}
              className="inline-flex items-center justify-center h-7 w-7 rounded-sm transition-colors hover:bg-[var(--paper-2)]"
              style={{ color: 'var(--ink-4)' }}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center h-7 w-7 rounded-sm transition-colors hover:bg-[var(--bad-wash)]"
              style={{ color: 'var(--ink-4)' }}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Score + source row */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0 rounded-sm text-[10.5px] font-semibold border"
            style={{ background: rc.bg, color: rc.text, borderColor: rc.border, fontFamily: 'var(--font-geist-mono)' }}
          >
            {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} · {riskScore}/25
          </span>
          <span className="text-[10.5px]" style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-4)' }}>
            L{threat.likelihood}×I{threat.impact}
          </span>
          {threat.source !== 'self_assessed' && (
            <span className="flex items-center gap-0.5 text-[10.5px]" style={{ color: 'var(--nav-accent)' }}>
              {threat.source === 'law_enforcement' && <BadgeCheck className="h-3 w-3" />}
              {THREAT_SOURCES.find(s => s.value === threat.source)?.label ?? threat.source}
              {threat.sourceAgency && ` — ${threat.sourceAgency}`}
            </span>
          )}
        </div>

        {/* Description */}
        {threat.description && (
          <p className="text-[12px] mt-1.5 line-clamp-3" style={{ color: 'var(--ink-2)', lineHeight: '1.5' }}>
            {threat.description}
          </p>
        )}

        {/* Vulnerability notes */}
        {threat.vulnerabilityNotes && (
          <div className="mt-2">
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--ink-4)' }}>
              Vulnerability
            </p>
            <p className="text-[12px] line-clamp-2" style={{ color: 'var(--ink-3)', lineHeight: '1.5' }}>
              {threat.vulnerabilityNotes}
            </p>
          </div>
        )}

        {/* Incident history */}
        {threat.incidentHistory && (
          <div className="mt-2">
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--ink-4)' }}>
              Incident History
            </p>
            <p className="text-[12px] line-clamp-2" style={{ color: 'var(--ink-3)', lineHeight: '1.5' }}>
              {threat.incidentHistory}
            </p>
          </div>
        )}

        {/* Empty state hints */}
        {!threat.vulnerabilityNotes && !threat.incidentHistory && (
          <p className="text-[11px] mt-2 italic" style={{ color: 'var(--ink-4)' }}>
            No vulnerability notes or incident history — click edit to add detail.
          </p>
        )}

        {/* Filing toggle */}
        <div className="mt-2.5">
          <FilingToggle
            id={threat.id}
            siteId={siteId}
            includedInFiling={threat.includedInFiling}
            onToggle={toggleThreatIncluded}
          />
        </div>
      </div>
    </div>
  )
}
