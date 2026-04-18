'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Check, Lightbulb, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepStatus = 'done' | 'active' | 'upcoming'

export interface GuideStep {
  number: number
  title: string
  eyebrow: string
  description: string
  why: string
  tips: string[]
  status: StepStatus
  count?: string
  blocker?: string
  cta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

function StatusBadge({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[11px] font-medium chip-ok">
        <Check className="h-3 w-3" />
        Complete
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[11px] font-medium"
        style={{ background: 'var(--nav-wash)', color: 'var(--nav-accent)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        Up next
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[11px] font-medium chip-muted">
      Upcoming
    </span>
  )
}

function StepNumberBadge({ number, status }: { number: number; status: StepStatus }) {
  if (status === 'done') {
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--ok)', color: '#fff' }}
      >
        <Check className="h-4 w-4" />
      </div>
    )
  }
  if (status === 'active') {
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-serif font-semibold text-[15px]"
        style={{ background: 'var(--nav-accent)', color: '#fff' }}
      >
        {number}
      </div>
    )
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-serif font-semibold text-[15px] border"
      style={{ background: 'var(--paper-2)', borderColor: 'var(--rule)', color: 'var(--ink-4)' }}
    >
      {number}
    </div>
  )
}

export function GuideSteps({ steps, initialOpen }: { steps: GuideStep[]; initialOpen: number }) {
  const [openStep, setOpenStep] = useState<number>(initialOpen)

  return (
    <div className="flex flex-col" style={{ gap: '1px', background: 'var(--rule)', border: '1px solid var(--rule)', borderRadius: '3px', overflow: 'hidden' }}>
      {steps.map((step, i) => {
        const isOpen = openStep === step.number
        const isLast = i === steps.length - 1

        return (
          <div key={step.number} className={cn('bg-white', isOpen && 'ring-1 ring-inset ring-[var(--nav-accent)]/20')}>
            {/* Header row */}
            <button
              onClick={() => setOpenStep(isOpen ? -1 : step.number)}
              className="w-full flex items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--paper-2)]"
            >
              <StepNumberBadge number={step.number} status={step.status} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'font-semibold text-[14.5px]',
                      step.status === 'upcoming' ? 'text-[var(--ink-3)]' : 'text-[var(--ink)]'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.count && (
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--ink-3)' }}
                    >
                      {step.count}
                    </span>
                  )}
                </div>
                {!isOpen && (
                  <p className="text-[12.5px] mt-0.5 truncate" style={{ color: 'var(--ink-3)' }}>
                    {step.eyebrow}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge status={step.status} />
                {isOpen
                  ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ink-4)' }} />
                  : <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ink-4)' }} />
                }
              </div>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="px-6 pb-6 pt-0 ml-12">
                {/* Connector line */}
                <div className="border-t mb-5" style={{ borderColor: 'var(--rule-2)' }} />

                <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 280px' }}>
                  {/* Left: description + tips */}
                  <div>
                    <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                      {step.description}
                    </p>

                    {step.blocker && (
                      <div className="mt-4 px-4 py-3 rounded-sm" style={{
                        background: 'var(--bad-wash)',
                        borderLeft: '3px solid var(--bad)',
                      }}>
                        <p className="text-[12.5px] font-medium" style={{ color: 'var(--bad)' }}>
                          Action needed
                        </p>
                        <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-2)' }}>
                          {step.blocker}
                        </p>
                      </div>
                    )}

                    {step.tips.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Lightbulb className="h-3.5 w-3.5" style={{ color: 'var(--warn)' }} />
                          <span className="font-mono-label" style={{ fontSize: '10px', color: 'var(--ink-3)' }}>
                            Tips
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {step.tips.map((tip, j) => (
                            <li key={j} className="flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                              <span className="flex-shrink-0 mt-1 w-1 h-1 rounded-full bg-current" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right: why + CTA */}
                  <div>
                    <div className="rounded-sm p-4 mb-4" style={{ background: 'var(--nav-wash)', border: '1px solid var(--rule)' }}>
                      <p className="font-mono-label mb-1.5" style={{ fontSize: '9.5px', color: 'var(--nav-accent)' }}>
                        Why this matters
                      </p>
                      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                        {step.why}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={step.cta.href}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-[13px] font-medium transition-opacity hover:opacity-90"
                        style={{
                          background: step.status === 'done' ? 'var(--paper-2)' : 'var(--nav-accent)',
                          color: step.status === 'done' ? 'var(--ink-2)' : '#fff',
                          border: step.status === 'done' ? '1px solid var(--rule)' : '1px solid var(--nav-accent)',
                        }}
                      >
                        {step.cta.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      {step.secondaryCta && (
                        <Link
                          href={step.secondaryCta.href}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-sm text-[12.5px] font-medium transition-colors hover:bg-[var(--paper-2)]"
                          style={{ border: '1px solid var(--rule)', color: 'var(--ink-2)' }}
                        >
                          {step.secondaryCta.label}
                        </Link>
                      )}
                    </div>

                    {!isLast && step.status === 'done' && (
                      <button
                        onClick={() => setOpenStep(steps[i + 1]?.number ?? -1)}
                        className="w-full mt-2 text-center text-[12px] font-medium transition-colors hover:text-[var(--ink)]"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        Next step →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
