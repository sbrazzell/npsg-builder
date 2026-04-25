# CLAUDE.md — npsg-builder

## What this project is

A grant application builder for the **Nonprofit Security Grant Program (NSGP)**, a FEMA program that funds physical security improvements at houses of worship and other nonprofits at risk of terrorism or targeted violence.

Users (grant writers / security consultants) manage **Organizations** → **Sites** → Threats, Security Measures, Projects, Budget Items, and AI-generated Narratives, then export a complete grant packet as a clean PDF.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (PostCSS), shadcn/ui, Base UI |
| ORM | Prisma 7 |
| DB (local) | SQLite (default datasource) |
| DB (prod) | Turso / libSQL via `@prisma/adapter-libsql` |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) |
| Forms | react-hook-form + zod |
| Toasts | sonner |
| Icons | lucide-react |
| Charts | recharts |
| Auth | next-auth v4 |
| File uploads | `@vercel/blob` — requires `BLOB_READ_WRITE_TOKEN` |
| Tests | Vitest 4 (`npm test` / `npm run test:watch`) |

---

## Key commands

```bash
npm run dev              # Dev server (http://localhost:3000)
npx tsc --noEmit         # Type check — run before every commit
npm run build            # prisma generate + next build
npx prisma db push       # Push schema changes to local DB
npx prisma studio        # Visual DB browser
npm run lint             # ESLint
npm test                 # Vitest (unit tests)
npm run test:watch       # Vitest watch mode
```

> **Always run `npx tsc --noEmit` before committing.** Clear `.next/` with `rm -rf .next` first if you see stale type errors — but only when the dev server is stopped.

---

## Route structure

The app uses **Next.js route groups**:

- **`(app)/`** — all main app pages, wrapped in the sidebar + sticky header layout
- **`(print)/`** — print-only pages, no sidebar/header/chrome
- **`api/`** — API routes (no layout)

```
/                               → dashboard
/guide                          → 8-step NSGP grant guide
/readiness                      → readiness checklist
/organizations                  → list all orgs
/organizations/[id]             → org detail
/organizations/[id]/edit        → edit org
/organizations/new              → create org
/sites                          → all sites grouped by org (with photo thumbnails)
/sites/new                      → create site (choose org first)
/sites/[id]                     → site dashboard
/sites/[id]/edit                → edit site details + upload site photo
/sites/[id]/threats             → threat assessments (likelihood × impact matrix)
/sites/[id]/measures            → existing security measures
/sites/[id]/projects            → project proposals + budget items
/sites/[id]/observations        → field walkthrough observations
/sites/[id]/narratives          → AI-generated grant narrative drafts
/sites/[id]/review              → pre-submission review checklist
/sites/[id]/export              → export tools
/sites/[id]/filings             → application draft versioning
/sites/[id]/filings/[draftId]   → view a specific draft (tabbed SF-424 / IJ / Budget / Packet)
/analyzer                       → grant readiness analyzer
/analyzer/[siteId]              → per-site AI analysis + scoring
/settings                       → app settings
/login                          → auth

# Print route (no app chrome — used for PDF export)
/sites/[id]/filings/[draftId]/print  → clean 4-form packet for browser print/Save as PDF
```

---

## Data model summary

```
Organization
  └── Site (many)
        ├── ThreatAssessment (many)        — likelihood/impact 1–5, incidentHistory
        ├── SecurityMeasure (many)         — category, effectivenessRating 1–5
        ├── ProjectProposal (many)
        │     ├── BudgetItem (many)
        │     └── ProjectThreatLink (many) — links projects to threats
        ├── SiteObservation (many)         — field walkthrough findings, severity 1–5
        ├── NarrativeDraft (many)          — AI-generated + human-edited sections
        ├── ApplicationDraft (many)        — versioned snapshots (filings)
        ├── ApplicationPacket (many)
        └── GrantAnalysis (many)           — AI scoring + flags
```

**Key Site fields:** `siteName`, `targetCycleYear` (Int, default 2026), `address`, `sitePhotoUrl` (String?, stored in Vercel Blob), `organizationId`, plus narrative fields (occupancy, population served, parking, surrounding area, public access, known concerns, law enforcement outreach).

**`FilingSnapshot`** (`src/actions/filings.ts`) — the JSON type stored in `ApplicationDraft.snapshotJson`. Contains a point-in-time copy of org, site, threats, securityMeasures, projects (with budgetItems), narratives, totalBudget. Always include `site` when building snapshots; older drafts may be missing it and are backfilled at read time.

---

## Naming conventions

### User-visible text
Always use **"site / sites"** — never "facility / facilities" in labels, toasts, breadcrumbs, descriptions, or button text.

### Internal code names (do not rename)
Some internal names were established early and are kept as-is to avoid churn:
- `facilitySchema`, `FacilityInput` — in `src/lib/validations.ts`
- `getFacility()`, `createFacility()` — in `src/actions/sites.ts`
- Local variables inside server actions may be named `facility`

Do not blindly rename these internal identifiers — it breaks the codebase.

---

## Design system

**Editorial warm-paper palette** — no dark mode.

```css
--paper:      #f7f5f0   /* page background */
--paper-2:    #efece4   /* subtle surfaces, sidebar */
--ink:        #1a1814   /* primary text */
--ink-2:      #3d3a33
--ink-3:      #6b665b   /* secondary text */
--ink-4:      #a19b8d   /* muted / placeholder */
--rule:       #d9d4c6   /* dividers, borders */
--rule-2:     #e8e3d4

/* Federal navy accent */
--nav-accent:   #1f2d5c  /* buttons, badges, icons */
--nav-accent-2: #2a3d7a
--nav-wash:     #e9ecf5  /* light navy tint */
--nav-ink:      #0d1638

/* Semantic risk colors */
--risk-critical: #8b1e1e
--risk-high:     #b6532a
--risk-med:      #a67c1a
--risk-low:      #4a6b2e
--ok: #2f5443 / --ok-wash: #e4ede4
--warn: #8a5a10 / --warn-wash: #f4ebd6
--bad: #8b1e1e / --bad-wash: #f2e2df

/* Radius: angular — 3px (0.1875rem) */
```

**Typography:**
- `font-serif` / `font-heading` → Fraunces (display headings, large numbers)
- `font-sans` → Geist Sans (body)
- `font-mono` → Geist Mono (numbers, codes, tabular data)
- `eyebrow` utility class → small uppercase tracking label above headings

---

## App layout (route groups)

```
src/app/
  layout.tsx              ← ROOT: html/body/fonts/AuthSessionProvider/Toaster only — NO sidebar
  globals.css             ← design tokens + print media rules
  (app)/
    layout.tsx            ← sidebar + sticky header (all main app pages)
    page.tsx, sites/, organizations/, ...
  (print)/
    layout.tsx            ← bare div wrapper — no chrome at all
    sites/[id]/filings/[draftId]/print/
      page.tsx            ← runs validation, renders 4-form packet
      print-trigger.tsx   ← 'use client' — auto-fires window.print(), status badge
      form-readiness-checklist.tsx ← validation checklist (Form 4 of 4)
  api/
    upload/route.ts       ← POST multipart → Vercel Blob, returns { url }
    auth/, ai/, threats/
```

The `(print)` route group is how we strip all app chrome from the PDF export. Do not move print pages into `(app)` or they will get the sidebar.

---

## Component patterns

### Server vs client
- Pages are **server components** by default (fetch data with Prisma directly)
- Mark `'use client'` only for interactive components (forms, modals, client state)
- Server actions are in `src/actions/` and use `'use server'`
- The Sidebar is `'use client'` (uses `usePathname`, `useSession`)

### Common layout pattern
```tsx
<div>
  <Header breadcrumbs={[...]} />
  <div className="px-8 pb-16 max-w-[960px]">
    {/* page content */}
  </div>
</div>
```

### Overlay link pattern (site cards)
Used on `/sites` to give the full row a link while the photo has its own independent link area:
```tsx
<div className="... group relative">
  <SitePhoto photoUrl={site.sitePhotoUrl} siteName={site.siteName} />
  <Link href={`/sites/${site.id}`} className="absolute inset-0" aria-label="Open site" />
  <div className="... pointer-events-none"> {/* info panel */} </div>
</div>
```

### Site photo
`sitePhotoUrl` is stored in Vercel Blob. Upload via `POST /api/upload` (multipart). The `/sites/[id]/edit` page has a photo upload UI with preview. The `/sites` listing shows the photo or a serif-initials color placeholder if none.

### Risk score helpers
```ts
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'
// getRiskLevel returns 'low' | 'medium' | 'high' | 'critical'
```

### AI assist
`<AiAssistTextarea>` in `src/components/shared/ai-assist-textarea.tsx` — wrap any long-form field to get AI drafting. Pass `context` object and `fieldLabel`.

---

## PDF export system

The PDF export lives entirely in the `(print)` route group. It is a server-rendered page with no app chrome — just the four form components plus a client `PrintTrigger` that auto-fires `window.print()`.

### Forms (all in `src/app/(app)/sites/[id]/filings/[draftId]/`)
| File | Content |
|---|---|
| `form-sf424.tsx` | SF-424 federal application form |
| `form-investment-justification.tsx` | IJ narrative — Part 1 (applicant), 2 (threats), 3 (projects), 4 (implementation) |
| `form-budget.tsx` | SF-424A-style budget — Summary, Categories, Project Detail, Narrative |

The print page imports these from their `(app)` path (file-system import, not URL).

### Validation (`src/lib/export-validation.ts`)
```ts
validateSnapshot(snapshot)  // → ValidationResult
// .issues[]  — severity: 'error' | 'warning' | 'info'
// .status    — 'incomplete' | 'review-ready' | 'submission-ready'
// .errorCount, .warningCount

isPlaceholder(value)      // detects blank / template placeholder strings
isGenericItemName(name)   // detects vague budget item descriptions
```

**Severity rules:**
- `error` — missing required org data (EIN, contact, address)
- `warning` — missing project sections, generic item names, empty budget
- `info` — NOFO-dependent fields (districts, dates, rep title) and system-gap sections (Timeline, Sustainment — not in DB yet)

A draft is never `submission-ready` as long as NOFO-dependent `info` issues exist.

### Text cleaning (`src/lib/export-text.ts`)
```ts
cleanText(raw)            // → { cleaned, flags[] }
cleanNarratives(record)   // → { cleaned, flags }
```
Protects acronyms, capitalises sentence starts, collapses repeated phrases, flags sentences > 45 words.

### Print header/footer
`PrintTrigger` renders `position: fixed` elements (`print-page-header`, `print-page-footer`) that repeat on every printed page. Hidden on screen via CSS. The timestamp is captured at `beforeprint` for exact audit accuracy.

### Readiness checklist (Form 4 of 4)
`FormReadinessChecklist` receives the `ValidationResult` from the server and renders:
1. Core forms generated (8 checks)
2. Errors + warnings from the validator
3. NOFO-dependent info items
4. SAA/FEMA required attachments table
5. Project × Section completeness matrix

---

## Tests

```bash
npm test               # run all tests once
npm run test:watch     # watch mode
```

Tests live in `src/__tests__/`. Currently:
- `export-validation.test.ts` — 41 tests covering: placeholder detection, congressional district flags, project section completeness (3-project scenarios), budget math integrity, generic item name detection, document status transitions.

Test setup: Vitest 4 + `@vitest/coverage-v8`, configured in `vitest.config.ts`. Path alias `@/` resolves to `src/`.

---

## Prisma / database notes

- Local dev uses plain **SQLite** (no adapter needed)
- Production uses **Turso** (libSQL) — adapter is wired in `src/lib/prisma.ts`
- After schema changes: `npx prisma db push` (dev)
- Seed: `npm run prisma:seed` (ts-node based)
- All cascade deletes are set — deleting an org removes all its sites and children
- `prisma db push` rejects libsql:// URLs if run locally — use the Turso HTTP API or push from CI for prod schema changes

---

## Environment variables

Check `.env.local` for:
- `DATABASE_URL` — Turso URL for production
- `DATABASE_AUTH_TOKEN` — Turso auth token
- `ANTHROPIC_API_KEY` — for AI assist and analyzer features
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — auth
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (required for site photo uploads)

---

## Things to avoid

- Do **not** put event handler props (`onClick`, etc.) on React Server Components — they can't be serialized and will crash in production. Use `'use client'` or the overlay link pattern.
- Do **not** move print pages into `(app)/` — they must stay in `(print)/` to avoid inheriting the sidebar layout.
- Do **not** nest `<a>` inside `<Link>` (or `<a>` inside `<a>`) — use the overlay pattern instead.
- Do **not** use "facility/facilities" in any user-facing string.
- Do **not** rename `facilitySchema`, `FacilityInput`, `getFacility`, or `createFacility` — these internal names are stable.
- Do **not** run bulk regex replacements across template literals — `${facility.id}` inside backtick strings will get corrupted.
- Do **not** `rm -rf .next` while the dev server is running — causes ENOENT crashes. Stop the server first.
- Do **not** add dark mode styles — the palette is light-only by design.
- Do **not** mark a draft as "submission-ready" or imply it's ready for FEMA/SAA without running `validateSnapshot` first. The form PDF always includes the readiness checklist.
