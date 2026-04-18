'use client'

import { useState } from 'react'
import { FormSF424 } from './form-sf424'
import { FormInvestmentJustification } from './form-investment-justification'
import { FormBudget } from './form-budget'
import type { FilingSnapshot } from '@/actions/filings'
import { cn } from '@/lib/utils'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TABS = [
  { id: 'sf424', label: 'SF-424', subtitle: 'Federal Application' },
  { id: 'ij', label: 'Investment Justification', subtitle: 'Narrative' },
  { id: 'budget', label: 'Budget Worksheet', subtitle: 'SF-424A' },
  { id: 'packet', label: 'Full Packet', subtitle: 'All Forms' },
]

export function DraftTabs({ snapshot }: { snapshot: FilingSnapshot }) {
  const [active, setActive] = useState('sf424')

  function handlePrint() {
    window.print()
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-end gap-0 border-b border-slate-200 mb-0 no-print overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors shrink-0',
              active === tab.id
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            )}
          >
            <span className="block">{tab.label}</span>
            <span className="block text-xs font-normal text-slate-400">{tab.subtitle}</span>
          </button>
        ))}
        <div className="ml-auto pb-2 px-2 no-print">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Form content */}
      <div className="mt-4">
        {active === 'sf424' && <FormSF424 snapshot={snapshot} />}
        {active === 'ij' && <FormInvestmentJustification snapshot={snapshot} />}
        {active === 'budget' && <FormBudget snapshot={snapshot} />}
        {active === 'packet' && (
          <div className="space-y-12">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Form 1 of 3 — SF-424</div>
              <FormSF424 snapshot={snapshot} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Form 2 of 3 — Investment Justification</div>
              <FormInvestmentJustification snapshot={snapshot} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Form 3 of 3 — Budget Worksheet</div>
              <FormBudget snapshot={snapshot} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
