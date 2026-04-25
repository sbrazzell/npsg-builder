import type { FilingSnapshot } from '@/actions/filings'
import { formatCurrency } from '@/lib/scoring'
import { isGenericItemName } from '@/lib/export-validation'

// NSGP-eligible budget categories (aligned with SF-424A Section B)
const CATEGORY_ORDER = [
  'Equipment',
  'Physical Security',
  'Technology',
  'Installation',
  'Training',
  'Planning',
  'Other',
]

export function FormBudget({ snapshot }: { snapshot: FilingSnapshot }) {
  const { organization: org, projects, totalBudget, narratives } = snapshot
  const site = snapshot.site ?? { siteName: 'Unknown Site', id: '', address: null }

  // Roll up budget items by category across all projects
  const categoryTotals: Record<string, number> = {}
  let grandTotal = 0
  for (const project of projects) {
    for (const item of project.budgetItems) {
      const cat = item.category || 'Other'
      categoryTotals[cat] = (categoryTotals[cat] || 0) + item.totalCost
      grandTotal += item.totalCost
    }
  }

  // Verify grand total matches snapshot total
  const totalMismatch = Math.abs(grandTotal - totalBudget) > 0.01

  const sortedCategories = Object.keys(categoryTotals).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  return (
    <div className="font-sans text-gray-900 bg-white" id="form-budget">
      {/* ── Header ── */}
      <div className="bg-slate-900 text-white px-8 py-6 mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
          Budget Information — SF-424A (Pre-Submission Draft)
        </p>
        <h1 className="text-xl font-bold">{org.name}</h1>
        <p className="text-slate-300">
          {site.siteName} · CFDA 97.008 · Total Request: {formatCurrency(totalBudget)}
        </p>
      </div>

      <div className="px-8 pb-8 space-y-8">
        {/* Budget math mismatch warning */}
        {totalMismatch && (
          <div className="rounded border border-red-300 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">
              ⚠ Budget total mismatch detected
            </p>
            <p className="text-xs text-red-700 mt-1">
              Snapshot total: {formatCurrency(totalBudget)} — Line items sum:{' '}
              {formatCurrency(grandTotal)}. Regenerate the draft to sync.
            </p>
          </div>
        )}

        {/* ── Section A — Budget Summary ── */}
        <section>
          <h2 className="budget-section-heading text-sm font-bold uppercase tracking-wide text-slate-700 border-b-2 border-slate-800 pb-1 mb-3">
            Section A — Budget Summary
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">
                  Grant Program / Function
                </th>
                <th className="border border-slate-300 p-2 text-right">Federal ($)</th>
                <th className="border border-slate-300 p-2 text-right">Non-Federal ($)</th>
                <th className="border border-slate-300 p-2 text-right">Total ($)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2">
                  Nonprofit Security Grant Program (NSGP)
                </td>
                <td className="border border-slate-300 p-2 text-right font-medium">
                  {formatCurrency(grandTotal)}
                </td>
                <td className="border border-slate-300 p-2 text-right">$0.00</td>
                <td className="border border-slate-300 p-2 text-right font-bold">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="border border-slate-300 p-2">TOTALS</td>
                <td className="border border-slate-300 p-2 text-right">
                  {formatCurrency(grandTotal)}
                </td>
                <td className="border border-slate-300 p-2 text-right">$0.00</td>
                <td className="border border-slate-300 p-2 text-right">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── Section B — Budget by Category ── */}
        <section>
          <h2 className="budget-section-heading text-sm font-bold uppercase tracking-wide text-slate-700 border-b-2 border-slate-800 pb-1 mb-3">
            Section B — Budget Categories
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left w-8">#</th>
                <th className="border border-slate-300 p-2 text-left">
                  Object Class Category
                </th>
                <th className="border border-slate-300 p-2 text-right">Federal Request</th>
                <th className="border border-slate-300 p-2 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((cat, i) => (
                <tr key={cat} className="even:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center text-slate-400">
                    {i + 1}
                  </td>
                  <td className="border border-slate-300 p-2 font-medium">{cat}</td>
                  <td className="border border-slate-300 p-2 text-right">
                    {formatCurrency(categoryTotals[cat])}
                  </td>
                  <td className="border border-slate-300 p-2 text-right text-slate-500">
                    {grandTotal > 0
                      ? ((categoryTotals[cat] / grandTotal) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-200 font-bold">
                <td className="border border-slate-300 p-2" colSpan={2}>
                  TOTAL
                </td>
                <td className="border border-slate-300 p-2 text-right">
                  {formatCurrency(grandTotal)}
                </td>
                <td className="border border-slate-300 p-2 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── Section C — Project-level detail ── */}
        <section>
          <h2 className="budget-section-heading text-sm font-bold uppercase tracking-wide text-slate-700 border-b-2 border-slate-800 pb-1 mb-3">
            Section C — Project Budget Detail
          </h2>
          {projects.map((project, idx) => {
            const projectLineTotal = project.budgetItems.reduce((s, b) => s + b.totalCost, 0)
            const lineTotalMismatch = Math.abs(projectLineTotal - project.projectBudget) > 0.01

            return (
              <div key={project.id} className="mb-6">
                <div className="budget-project-header flex items-center justify-between bg-slate-800 text-white px-3 py-2 rounded-t">
                  <span className="text-sm font-semibold">
                    Project {idx + 1}: {project.title}
                  </span>
                  <span className="text-sm text-emerald-300 font-bold">
                    {formatCurrency(project.projectBudget)}
                  </span>
                </div>

                {project.budgetItems.length > 0 ? (
                  <table className="w-full text-sm border-collapse border-x border-b border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 text-left">
                          Item Description
                        </th>
                        <th className="border border-slate-300 p-2 text-left">Category</th>
                        <th className="border border-slate-300 p-2 text-right">Qty</th>
                        <th className="border border-slate-300 p-2 text-right">Unit Cost</th>
                        <th className="border border-slate-300 p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.budgetItems.map((item) => {
                        const generic = isGenericItemName(item.itemName)
                        return (
                          <tr
                            key={item.id}
                            className={`even:bg-slate-50 ${generic ? 'bg-amber-50' : ''}`}
                          >
                            <td className="border border-slate-300 p-2">
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  <p
                                    className={`font-medium ${generic ? 'text-amber-800' : ''}`}
                                  >
                                    {item.itemName}
                                  </p>
                                  {item.justification && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {item.justification}
                                    </p>
                                  )}
                                  {item.vendorName && (
                                    <p className="text-xs text-blue-600 mt-0.5">
                                      Vendor: {item.vendorName}
                                    </p>
                                  )}
                                  {generic && (
                                    <p className="text-[10px] text-amber-600 italic mt-0.5">
                                      ⚠ Description too generic — FEMA reviewers require specific
                                      model/type info (e.g. "HID multiClass SE325 card reader")
                                    </p>
                                  )}
                                </div>
                                {generic && (
                                  <span className="flex-shrink-0 text-[9px] font-bold border border-amber-400 text-amber-600 rounded px-1 mt-0.5">
                                    GENERIC
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="border border-slate-300 p-2 text-slate-600">
                              {item.category || '—'}
                            </td>
                            <td className="border border-slate-300 p-2 text-right">
                              {item.quantity}
                            </td>
                            <td className="border border-slate-300 p-2 text-right">
                              {formatCurrency(item.unitCost)}
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-medium">
                              {formatCurrency(item.totalCost)}
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="bg-slate-100 font-bold">
                        <td
                          colSpan={4}
                          className="border border-slate-300 p-2 text-right"
                        >
                          Project Total
                        </td>
                        <td
                          className={`border border-slate-300 p-2 text-right ${
                            lineTotalMismatch ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(projectLineTotal)}
                          {lineTotalMismatch && (
                            <span className="block text-[9px] font-normal text-red-600">
                              ≠ snapshot: {formatCurrency(project.projectBudget)}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="border border-dashed border-amber-300 bg-amber-50 rounded-b p-4 text-center text-sm text-amber-700">
                    ⚠ No budget items entered for this project — required for grant review.
                  </div>
                )}
              </div>
            )
          })}
        </section>

        {/* ── Section D — Budget Narrative ── */}
        {narratives['budget_rationale'] && (
          <section>
            <h2 className="budget-section-heading text-sm font-bold uppercase tracking-wide text-slate-700 border-b-2 border-slate-800 pb-1 mb-3">
              Section D — Budget Narrative / Justification
            </h2>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {narratives['budget_rationale']}
            </p>
          </section>
        )}

        {/* ── Grand total callout ── */}
        <div className="rounded-lg bg-slate-50 border-2 border-slate-800 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide">
              Total Federal Grant Request
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              CFDA 97.008 — Nonprofit Security Grant Program
            </p>
          </div>
          <p className="text-4xl font-bold text-emerald-700">{formatCurrency(grandTotal)}</p>
        </div>
      </div>
    </div>
  )
}
