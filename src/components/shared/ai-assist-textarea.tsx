'use client'

import { useState, useRef } from 'react'
import { Sparkles, Loader2, Check, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiAssistTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange'> {
  /** Human-readable field label used to prompt the AI */
  fieldLabel: string
  /** Contextual data (facility name, org, etc.) passed to the AI */
  context?: Record<string, string | number | undefined>
  /** Initial textarea value (replaces defaultValue) */
  initialValue?: string
  /** Called whenever the internal value changes */
  onValueChange?: (value: string) => void
}

export function AiAssistTextarea({
  fieldLabel,
  context = {},
  initialValue = '',
  onValueChange,
  className,
  rows = 3,
  ...rest
}: AiAssistTextareaProps) {
  const [value, setValue] = useState(initialValue)
  const [suggestion, setSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [noKey, setNoKey] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    onValueChange?.(e.target.value)
  }

  async function handleAssist() {
    setLoading(true)
    setError('')
    setSuggestion('')

    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldLabel,
          currentValue: value,
          context,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'AI assist failed')
        setNoKey(!!data.noKey)
      } else {
        setSuggestion(data.suggestion)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleAccept() {
    setValue(suggestion)
    onValueChange?.(suggestion)
    setSuggestion('')
    setError('')
    // Focus the textarea after accepting
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function handleDismiss() {
    setSuggestion('')
    setError('')
  }

  return (
    <div className="relative">
      {/* Textarea wrapper */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          {...rest}
          rows={rows}
          value={value}
          onChange={handleChange}
          className={cn(
            'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            'pr-10', // room for the sparkle button
            className
          )}
        />

        {/* Sparkle button — top-right inside textarea */}
        <button
          type="button"
          onClick={handleAssist}
          disabled={loading}
          title="AI field assist"
          className={cn(
            'absolute top-2 right-2 p-1 rounded-md transition-all duration-150',
            'text-slate-300 hover:text-indigo-500 hover:bg-indigo-50',
            loading && 'text-indigo-400 cursor-not-allowed'
          )}
          aria-label="Generate AI suggestion"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-1.5 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            {noKey ? (
              <>
                AI assist requires an <code className="font-mono bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> in your <code className="font-mono bg-amber-100 px-1 rounded">.env</code> file.
              </>
            ) : error}
          </span>
        </div>
      )}

      {/* Suggestion panel */}
      {suggestion && !error && (
        <div className="mt-1.5 rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100/60 border-b border-indigo-200">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-700">AI suggestion</span>
            <span className="text-xs text-indigo-400 ml-auto">Review before accepting</span>
          </div>
          <div className="px-3 py-2.5">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{suggestion}</p>
          </div>
          <div className="flex gap-2 px-3 pb-2.5">
            <button
              type="button"
              onClick={handleAccept}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Check className="h-3 w-3" />
              Use this
            </button>
            <button
              type="button"
              onClick={handleAssist}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              Try again
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3 w-3" />
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
