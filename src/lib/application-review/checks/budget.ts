// ─── Budget Quality Checks ────────────────────────────────────────────────────
// Verifies that budget line items are specific, well-justified, and defensible.

import type { FilingSnapshot } from '@/actions/filings'
import type { ReviewFinding } from '../types'
import { isGenericItemName } from '@/lib/export-validation'
import { slug } from '../utils'

/** Category-aware placeholder suggestions for generic budget items. */
function suggestSpecificName(
  itemName: string,
  category: string | null | undefined,
  projectTitle: string,
): string {
  const cat = (category ?? '').toLowerCase()
  const proj = projectTitle.toLowerCase()

  if (cat === 'equipment' || proj.includes('access control') || proj.includes('card reader')) {
    return `[REPLACE] Specific access control equipment description required. Example: "HID multiClass SE325 card reader, 940PTNNEK00000" or "Schlage NDE Series wireless lock, model NDE80PD SPA 626 — include model number and finish."`
  }
  if (cat === 'technology' || proj.includes('camera') || proj.includes('cctv') || proj.includes('surveillance')) {
    return `[REPLACE] Specific camera/technology description required. Example: "Axis P3245-V Fixed Dome Camera, 1080p, H.265, PoE" — include manufacturer, model number, and key specifications.`
  }
  if (proj.includes('lighting') || cat === 'physical security') {
    return `[REPLACE] Specific lighting/physical security equipment description required. Example: "Philips Gardco LED Area Light, 120W, 4000K, Type III distribution, pole-mount" — include manufacturer, wattage, and mounting type.`
  }
  if (cat === 'training') {
    return `[REPLACE] Specific training description required. Example: "ALERRT Active Threat Response training for 25 staff — 8-hour course, instructor-led, with participant materials." Include provider, duration, and participant count.`
  }
  if (cat === 'installation') {
    return `[REPLACE] Specific installation service description required. Example: "Professional installation of 8 HID card readers and 2-door control panels by licensed security integrator — includes conduit, cabling, and configuration." Describe scope of work.`
  }
  if (cat === 'planning') {
    return `[REPLACE] Specific planning service description required. Example: "Security vulnerability assessment by Certified Protection Professional (CPP) — site survey, written report, and corrective action plan." Include deliverables.`
  }
  return `[REPLACE] Specific item description required for "${itemName}". Include manufacturer, model number, specifications, and any other details that uniquely identify the item. Avoid generic category names — FEMA reviewers require specific, verifiable descriptions.`
}

export function checkBudgetQuality(snapshot: FilingSnapshot): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  const { projects } = snapshot

  for (const project of projects) {
    const pid = slug(project.id)

    for (const item of project.budgetItems) {
      const iid = slug(item.id)
      const itemLabel = item.itemName

      // ── Generic item name ───────────────────────────────────────────────

      if (isGenericItemName(item.itemName)) {
        findings.push({
          id: `budget-generic-item-${pid}-${iid}`,
          severity: 'warning',
          category: 'budget',
          title: `Budget item name is too generic: "${itemLabel}"`,
          explanation:
            `"${itemLabel}" does not include sufficient detail to satisfy FEMA's budget reviewers. Generic names (e.g., "Security equipment", "Camera", "Hardware") are routinely questioned or denied. FEMA expects manufacturer, model, and specifications.`,
          affectedSection: 'Budget Worksheet',
          affectedEntityId: item.id,
          affectedEntityLabel: itemLabel,
          recommendedAction:
            'Replace this name with the specific manufacturer, model number, and specifications of the item.',
          canAutoFix: true,
          proposedFix: {
            type: 'budget_item_rename',
            targetPath: `projects[${project.id}].budgetItems[${item.id}].itemName`,
            original: item.itemName,
            proposed: suggestSpecificName(item.itemName, item.category, project.title),
            requiresEvidenceConfirmation: true,
            evidenceNote:
              'You must enter the actual manufacturer and model number for this item. The placeholder text above is a template only — do not accept it without editing.',
            guardrailTags: ['no_invented_quotes', 'user_must_confirm'],
          },
          resolved: false,
          rejected: false,
        })
      }

      // ── Missing vendor name ─────────────────────────────────────────────

      if (!item.vendorName?.trim()) {
        findings.push({
          id: `budget-no-vendor-${pid}-${iid}`,
          severity: 'suggestion',
          category: 'budget',
          title: `No vendor name for "${itemLabel}"`,
          explanation:
            'Including a vendor or supplier name shows that pricing is based on actual quotes, not guesses. Reviewers look for vendor-referenced costs.',
          affectedSection: 'Budget Worksheet',
          affectedEntityId: item.id,
          affectedEntityLabel: itemLabel,
          recommendedAction:
            'Add the vendor or supplier name (e.g., the company providing the equipment or service). Evidence needed — user must confirm.',
          canAutoFix: false,
          resolved: false,
          rejected: false,
        })
      }

      // ── Missing justification ───────────────────────────────────────────

      if (!item.justification?.trim()) {
        findings.push({
          id: `budget-no-justification-${pid}-${iid}`,
          severity: 'suggestion',
          category: 'budget',
          title: `No justification for "${itemLabel}"`,
          explanation:
            'Each budget line item should have a brief justification explaining why it is needed and how it addresses the documented threat. This is especially important for items that are not self-explanatory.',
          affectedSection: 'Budget Worksheet',
          affectedEntityId: item.id,
          affectedEntityLabel: itemLabel,
          recommendedAction:
            'Add a short justification (1-2 sentences) explaining why this specific item is necessary.',
          canAutoFix: false,
          resolved: false,
          rejected: false,
        })
      }

      // ── Zero or negative cost ───────────────────────────────────────────

      if (item.totalCost <= 0 || item.unitCost <= 0) {
        findings.push({
          id: `budget-zero-cost-${pid}-${iid}`,
          severity: 'blocker',
          category: 'budget',
          title: `Budget item "${itemLabel}" has zero or missing cost`,
          explanation:
            'This budget item has no cost assigned. FEMA cannot process a budget with zero-cost line items — each item must have a positive quantity and unit cost.',
          affectedSection: 'Budget Worksheet',
          affectedEntityId: item.id,
          affectedEntityLabel: itemLabel,
          recommendedAction: 'Enter a valid quantity and unit cost for this item.',
          canAutoFix: false,
          resolved: false,
          rejected: false,
        })
      }

      // ── Zero quantity ───────────────────────────────────────────────────

      if (item.quantity <= 0) {
        findings.push({
          id: `budget-zero-quantity-${pid}-${iid}`,
          severity: 'blocker',
          category: 'budget',
          title: `Budget item "${itemLabel}" has zero quantity`,
          explanation:
            'Every budget item must have a quantity of at least 1.',
          affectedSection: 'Budget Worksheet',
          affectedEntityId: item.id,
          affectedEntityLabel: itemLabel,
          recommendedAction: 'Set a valid quantity for this item.',
          canAutoFix: false,
          resolved: false,
          rejected: false,
        })
      }
    }
  }

  return findings
}
