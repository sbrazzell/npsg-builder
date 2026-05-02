'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { saveGeneratedProjects } from '@/actions/projects'
import { formatCurrency } from '@/lib/scoring'
import { Sparkles, X, ChevronDown, ChevronUp, DollarSign, Shield, AlertCircle, Loader2, Check } from 'lucide-react'
import type { GenerationResult, GeneratedProject } from '@/app/api/ai/generate-projects/route'

// ─── Step-by-step progress indicator ─────────────────────────────────────────

type StepStatus = 'waiting' | 'active' | 'done'

const STEPS: { label: string; detail: string }[] = [
  { label: 'Collecting site information',  detail: 'threats, measures, observations' },
  { label: 'Analyzing security gaps',      detail: 'vulnerability mapping' },
  { label: 'Building analysis prompt',     detail: 'structuring for NSGP context' },
  { label: 'Waiting for Claude',           detail: 'AI generating proposals…' },
  { label: 'Parsing project proposals',   detail: 'extracting structured data' },
]

// How long each pre-AI step is visible (ms) before auto-advancing
const PRE_STEP_DURATIONS = [700, 800, 600] // steps 0→1, 1→2, 2→3

function GenerationProgress({
  advanceFnRef,
}: {
  // Parent writes a callback here so it can trigger the post-AI steps
  advanceFnRef: React.MutableRefObject<(() => void) | null>
}) {
  const [statuses, setStatuses] = useState<StepStatus[]>(
    STEPS.map((_, i) => (i === 0 ? 'active' : 'waiting'))
  )
  const [elapsed, setElapsed] = useState(0)
  const aiStartRef = useRef<number | null>(null)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    function advanceTo(step: number) {
      setStatuses(STEPS.map((_, i) =>
        i < step ? 'done' : i === step ? 'active' : 'waiting'
      ))
      if (step === 3) aiStartRef.current = Date.now()
    }

    // Advance through pre-AI steps on timers
    let acc = 0
    PRE_STEP_DURATIONS.forEach((dur, i) => {
      acc += dur
      timers.push(setTimeout(() => advanceTo(i + 1), acc))
    })

    // Register the "fetch resolved" callback in the parent's ref
    advanceFnRef.current = () => {
      timers.forEach(clearTimeout)
      advanceTo(4)
      setTimeout(() => {
        setStatuses(STEPS.map(() => 'done'))
      }, 500)
    }

    return () => {
      timers.forEach(clearTimeout)
      advanceFnRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tick the elapsed counter while waiting for Claude
  useEffect(() => {
    if (statuses[3] !== 'active') return
    const id = setInterval(() => {
      setElapsed(aiStartRef.current ? Math.floor((Date.now() - aiStartRef.current) / 1000) : 0)
    }, 1000)
    return () => clearInterval(id)
  }, [statuses])

  return (
    <div className="rounded-sm border p-6" style={{ borderColor: 'var(--rule)', background: 'var(--paper-2)' }}>
      <p className="font-semibold text-[14px] mb-5" style={{ color: 'var(--ink)' }}>
        Generating AI project proposals…
      </p>
      <ol className="space-y-4">
        {STEPS.map((step, i) => {
          const status = statuses[i]
          const isAiStep = i === 3
          return (
            <li key={i} className="flex items-start gap-3">
              {/* Status icon */}
              <div className="mt-0.5 shrink-0" style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {status === 'done' ? (
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{ width: 20, height: 20, background: 'var(--ok)' }}
                  >
                    <Check className="h-3 w-3 text-white" />
                  </div>
                ) : status === 'active' ? (
                  <Loader2 className="animate-spin" style={{ width: 18, height: 18, color: 'var(--nav-accent)' }} />
                ) : (
                  <div
                    className="rounded-full border-2"
                    style={{ width: 16, height: 16, borderColor: 'var(--rule)' }}
                  />
                )}
              </div>
              {/* Text */}
              <div>
                <p
                  className="text-[13px] font-medium"
                  style={{
                    color: status === 'done' ? 'var(--ink-3)' : status === 'active' ? 'var(--ink)' : 'var(--ink-4)',
                  }}
                >
                  {step.label}
                  {isAiStep && status === 'active' && elapsed > 0 && (
                    <span
                      className="ml-2 font-normal tabular-nums"
                      style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-geist-mono)' }}
                    >
                      {elapsed}s
                    </span>
                  )}
                </p>
                {status === 'active' && step.detail && (
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ─── Category colors ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Access Control':    { bg: '#e9ecf5', text: '#1f2d5c', border: '#c5cde8' },
  'Surveillance':      { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  'Lighting':          { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  'Physical Hardening':{ bg: '#fef2f2', text: '#7f1d1d', border: '#fecaca' },
  'Communication':     { bg: '#f5f3ff', text: '#4c1d95', border: '#ddd6fe' },
}

const PRIORITY_LABEL: Record<number, string> = { 5: 'Critical', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Minimal' }

// ─── Main component ───────────────────────────────────────────────────────────

type Phase = 'idle' | 'loading' | 'review' | 'saving'

type ProjectReviewState = {
  project: GeneratedProject
  included: boolean
  status: 'selected' | 'consideration'
  expanded: boolean
}

export function ProjectGenerator({
  siteId,
  hasExistingProjects,
  siteThreats = [],
}: {
  siteId: string
  hasExistingProjects: boolean
  siteThreats?: { id: string; threatType: string }[]
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [projectStates, setProjectStates] = useState<ProjectReviewState[]>([])
  const [error, setError] = useState<string | null>(null)
  // GenerationProgress writes its advance function here; handleGenerate calls it when fetch resolves
  const advanceFnRef = useRef<(() => void) | null>(null)

  async function handleGenerate() {
    setError(null)
    setPhase('loading')
    try {
      const res = await fetch('/api/ai/generate-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      })
      const data = await res.json()

      // Signal the progress stepper that the AI responded
      advanceFnRef.current?.()

      if (!res.ok) {
        setError(data.error || 'Generation failed. Please try again.')
        setPhase('idle')
        return
      }

      const gen = data as GenerationResult
      setResult(gen)
      setProjectStates(gen.projects.map((p) => ({
        project: p,
        included: true,
        status: p.status,
        expanded: false,
      })))
      // Brief pause so user sees the final steps check off before switching to review
      setTimeout(() => setPhase('review'), 1100)
    } catch {
      setError('Network error. Please try again.')
      setPhase('idle')
    }
  }

  async function handleSave() {
    const toSave = projectStates.filter((s) => s.included)
    if (toSave.length === 0) return
    setPhase('saving')
    const res = await saveGeneratedProjects(
      siteId,
      toSave.map((s) => ({ ...s.project, status: s.status }))
    )
    if (!res.success) {
      setError(res.error || 'Save failed.')
      setPhase('review')
      return
    }
    router.refresh()
    setPhase('idle')
    setResult(null)
    setProjectStates([])
  }

  function toggleIncluded(idx: number) {
    setProjectStates((prev) => prev.map((s, i) => i === idx ? { ...s, included: !s.included } : s))
  }

  function toggleStatus(idx: number) {
    setProjectStates((prev) =>
      prev.map((s, i) => i === idx ? { ...s, status: s.status === 'selected' ? 'consideration' : 'selected' } : s)
    )
  }

  function toggleExpanded(idx: number) {
    setProjectStates((prev) => prev.map((s, i) => i === idx ? { ...s, expanded: !s.expanded } : s))
  }

  // Build a type→label map for display in the review panel ("T-1", "T-2", ...)
  const threatLabelByType = new Map(siteThreats.map((t, i) => [t.threatType.toLowerCase(), `T-${i + 1}`]))

  const includedProjects = projectStates.filter((s) => s.included)
  const selectedBudget = includedProjects
    .filter((s) => s.status === 'selected')
    .reduce((sum, s) => sum + s.project.budgetItems.reduce((b, item) => b + item.totalCost, 0), 0)

  // ── Idle ──
  if (phase === 'idle') {
    return (
      <div className="flex items-center gap-3">
        {error && (
          <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--bad)' }}>
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </span>
        )}
        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-sm text-[13px] font-medium border transition-opacity hover:opacity-80"
          style={{ background: 'var(--paper)', borderColor: 'var(--nav-accent)', color: 'var(--nav-accent)' }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {hasExistingProjects ? 'Generate More Projects' : 'Generate AI Projects'}
        </button>
      </div>
    )
  }

  // ── Loading ──
  if (phase === 'loading') {
    return <GenerationProgress advanceFnRef={advanceFnRef} />
  }

  if (!result || projectStates.length === 0) return null

  const selectedStates = projectStates.filter((s) => s.status === 'selected')
  const considerationStates = projectStates.filter((s) => s.status === 'consideration')

  // ── Review ──
  return (
    <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'var(--nav-accent)', borderWidth: '1.5px' }}>
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: 'var(--nav-accent)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-white" />
          <p className="font-semibold text-[14px] text-white">AI-Generated Project Proposals</p>
          <span className="text-[12px] text-white/70 ml-1">
            {result.projects.length} proposals · review and select before saving
          </span>
        </div>
        <button
          onClick={() => { setPhase('idle'); setResult(null); setProjectStates([]) }}
          className="text-white/60 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Budget strategy */}
      <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--rule)', background: 'var(--nav-wash)' }}>
        <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          <span className="font-semibold" style={{ color: 'var(--nav-accent)' }}>Budget Strategy: </span>
          {result.budgetStrategy}
        </p>
        <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {result.layeredSecuritySummary}
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Selected */}
        {selectedStates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full" style={{ background: 'var(--ok)' }} />
              <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ok)' }}>
                Selected for Grant Inclusion
              </p>
              <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
                {selectedStates.filter((s) => s.included).length} included · {formatCurrency(selectedBudget)} est. budget
              </span>
            </div>
            <div className="space-y-2">
              {selectedStates.map((s) => {
                const idx = projectStates.indexOf(s)
                return (
                  <ProjectReviewCard key={idx} state={s}
                    threatLabelByType={threatLabelByType}
                    onToggleIncluded={() => toggleIncluded(idx)}
                    onToggleStatus={() => toggleStatus(idx)}
                    onToggleExpanded={() => toggleExpanded(idx)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Consideration */}
        {considerationStates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full" style={{ background: 'var(--ink-4)' }} />
              <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
                Consideration Phase
              </p>
              <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
                Lower priority · useful for future funding rounds
              </span>
            </div>
            <div className="space-y-2">
              {considerationStates.map((s) => {
                const idx = projectStates.indexOf(s)
                return (
                  <ProjectReviewCard key={idx} state={s}
                    threatLabelByType={threatLabelByType}
                    onToggleIncluded={() => toggleIncluded(idx)}
                    onToggleStatus={() => toggleStatus(idx)}
                    onToggleExpanded={() => toggleExpanded(idx)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {error && (
          <p className="text-[12.5px] flex items-center gap-1.5" style={{ color: 'var(--bad)' }}>
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
        <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--rule)' }}>
          <p className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
            {includedProjects.length} of {projectStates.length} proposals selected to save
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPhase('idle'); setResult(null); setProjectStates([]) }}
              className="px-3 py-[6px] rounded-sm text-[13px] border transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink-3)' }}
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={phase === 'saving' || includedProjects.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-sm text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--nav-accent)', color: '#fff' }}
            >
              {phase === 'saving' ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
              ) : (
                <><Check className="h-3.5 w-3.5" />Add {includedProjects.length} Project{includedProjects.length !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ProjectReviewCard({
  state, threatLabelByType, onToggleIncluded, onToggleStatus, onToggleExpanded,
}: {
  state: ProjectReviewState
  threatLabelByType: Map<string, string>
  onToggleIncluded: () => void
  onToggleStatus: () => void
  onToggleExpanded: () => void
}) {
  const { project, included, status, expanded } = state
  const catStyle = CATEGORY_COLORS[project.category] ?? { bg: 'var(--paper-2)', text: 'var(--ink-3)', border: 'var(--rule)' }
  const projectBudget = project.budgetItems.reduce((s, b) => s + b.totalCost, 0)

  // Resolve threat labels for this project (e.g. ["T-1", "T-3"])
  const threatRefs = (project.addressedThreatTypes ?? [])
    .map((t) => ({ label: threatLabelByType.get(t.toLowerCase()), type: t }))
    .filter((r): r is { label: string; type: string } => !!r.label)

  return (
    <div
      className="rounded-sm border overflow-hidden transition-opacity"
      style={{
        borderColor: included ? 'var(--rule)' : 'var(--rule-2)',
        background: included ? 'white' : 'var(--paper-2)',
        opacity: included ? 1 : 0.55,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={onToggleIncluded}
          className="shrink-0 rounded border-2 flex items-center justify-center transition-colors"
          style={{
            width: 18, height: 18,
            borderColor: included ? 'var(--nav-accent)' : 'var(--rule)',
            background: included ? 'var(--nav-accent)' : 'white',
          }}
        >
          {included && <Check className="h-2.5 w-2.5 text-white" />}
        </button>

        {/* Priority */}
        <div
          className="shrink-0 rounded-full flex items-center justify-center font-serif font-semibold text-white"
          style={{ width: 28, height: 28, background: project.priority >= 4 ? 'var(--nav-accent)' : 'var(--ink-4)', fontSize: 12 }}
        >
          {project.priority}
        </div>

        {/* Title + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[13.5px]" style={{ color: 'var(--ink)' }}>{project.title}</span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-sm border"
              style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}
            >
              {project.category}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
              Priority {project.priority} — {PRIORITY_LABEL[project.priority] ?? ''}
            </span>
          </div>
          {threatRefs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {threatRefs.map((r) => (
                <span key={r.label} className="text-[10.5px] px-1.5 py-0.5 rounded-sm font-mono" style={{ background: 'var(--nav-wash)', color: 'var(--nav-accent)', border: '1px solid var(--rule)' }}>
                  {r.label}
                </span>
              ))}
              <span className="text-[10.5px] self-center" style={{ color: 'var(--ink-4)' }}>mitigated</span>
            </div>
          )}
          {!expanded && project.problemStatement && (
            <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-3)' }}>
              {project.problemStatement}
            </p>
          )}
        </div>

        {/* Budget + status toggle + expand */}
        <div className="flex items-center gap-2 shrink-0">
          {projectBudget > 0 && (
            <span className="flex items-center gap-0.5 text-[12.5px] font-medium" style={{ color: 'var(--ok)' }}>
              <DollarSign className="h-3 w-3" />{formatCurrency(projectBudget)}
            </span>
          )}
          <button
            onClick={onToggleStatus}
            className="text-[11px] px-2 py-1 rounded-sm border transition-colors"
            style={
              status === 'selected'
                ? { background: '#e4ede4', color: 'var(--ok)', borderColor: '#b5d4b5' }
                : { background: 'var(--paper-2)', color: 'var(--ink-3)', borderColor: 'var(--rule)' }
            }
            title="Toggle Selected / Consideration"
          >
            {status === 'selected'
              ? <span className="flex items-center gap-1"><Shield className="h-3 w-3" />Selected</span>
              : 'Consideration'}
          </button>
          <button onClick={onToggleExpanded} style={{ color: 'var(--ink-4)' }}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t space-y-3" style={{ borderColor: 'var(--rule-2)' }}>
          {threatRefs.length > 0 && (
            <div className="pt-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-3)' }}>Threats Mitigated</p>
              <div className="flex flex-wrap gap-1.5">
                {threatRefs.map((r) => (
                  <span key={r.label} className="text-[11px] px-2 py-0.5 rounded-sm font-mono" style={{ background: 'var(--nav-wash)', color: 'var(--nav-accent)', border: '1px solid #c5cde8' }}>
                    {r.label} · {r.type}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className={threatRefs.length > 0 ? 'grid grid-cols-2 gap-4' : 'pt-3 grid grid-cols-2 gap-4'}>
            <DetailField label="Problem Statement" value={project.problemStatement} />
            <DetailField label="Proposed Solution" value={project.proposedSolution} />
            <DetailField label="Risk Reduction / NSGP Alignment" value={project.riskReductionRationale} />
            <DetailField label="Implementation Notes" value={project.implementationNotes} />
          </div>
          {project.budgetItems.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-3)' }}>
                Budget Items
              </p>
              <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: 'var(--paper-2)' }}>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--ink-3)' }}>Item</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--ink-3)' }}>Qty</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--ink-3)' }}>Unit</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--ink-3)' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.budgetItems.map((item, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--rule-2)' }}>
                        <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{item.itemName}</td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-geist-mono)' }}>{item.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-geist-mono)' }}>{formatCurrency(item.unitCost)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium" style={{ color: 'var(--ink)', fontFamily: 'var(--font-geist-mono)' }}>{formatCurrency(item.totalCost)}</td>
                      </tr>
                    ))}
                    <tr className="border-t" style={{ borderColor: 'var(--rule)', background: 'var(--paper-2)' }}>
                      <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }} colSpan={3}>Project Total</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--ok)', fontFamily: 'var(--font-geist-mono)' }}>
                        {formatCurrency(projectBudget)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-3)' }}>{label}</p>
      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{value}</p>
    </div>
  )
}
