# CLAUDE.md — npsg-builder

## What this project is

A grant application builder for the **Nonprofit Security Grant Program (NSGP)**, a FEMA program that funds physical security improvements at houses of worship and other nonprofits at risk of terrorism or targeted violence.

Users (grant writers / security consultants) manage **Organizations** → **Sites** → Threats, Security Measures, Projects, Budget Items, and AI-generated Narratives, then export a complete grant packet.

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

---

## Key commands

```bash
# Dev server
npm run dev

# Type check (run this before committing)
npx tsc --noEmit

# Build (runs prisma generate first)
npm run build

# Push schema changes to local DB
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Lint
npm run lint
```

> **Always run `npx tsc --noEmit` before committing.** Clear `.next/` with `rm -rf .next` first if you see stale type errors from that directory.

---

## Route structure

```
/                          → dashboard / home
/guide                     → 8-step NSGP grant guide
/readiness                 → readiness checklist
/organizations             → list all orgs
/organizations/[id]        → org detail
/organizations/[id]/edit   → edit org
/organizations/new         → create org
/sites                     → all sites grouped by org (with SVG map thumbnails)
/sites/new                 → create site (choose org first)
/sites/[id]                → site dashboard
/sites/[id]/edit           → edit site details
/sites/[id]/threats        → threat assessments (likelihood × impact matrix)
/sites/[id]/measures       → existing security measures
/sites/[id]/projects       → project proposals + budget items
/sites/[id]/observations   → field walkthrough observations
/sites/[id]/narratives     → AI-generated grant narrative drafts
/sites/[id]/review         → pre-submission review checklist
/sites/[id]/export         → export to PDF / packet
/sites/[id]/filings        → application draft versioning
/analyzer                  → grant readiness analyzer
/analyzer/[siteId]         → per-site AI analysis + scoring
/settings                  → app settings
```

---

## Data model summary

```
Organization
  └── Site (many)
        ├── ThreatAssessment (many)        — likelihood/impact 1–5, incidentHistory field
        ├── ExistingSecurityMeasure (many) — category, effectivenessRating 1–5
        ├── ProjectProposal (many)
        │     ├── BudgetItem (many)
        │     └── ProjectThreatLink (many) — links projects to threats
        ├── SiteObservation (many)         — field walkthrough findings, severity 1–5
        ├── NarrativeDraft (many)          — AI-generated + human-edited text sections
        ├── ApplicationDraft (many)        — versioned snapshots (filings)
        ├── ApplicationPacket (many)
        └── GrantAnalysis (many)           — AI scoring + flags
```

**Key Site fields:** `siteName`, `targetCycleYear` (Int, default 2026), `address`, `organizationId`, plus narrative fields (occupancy, population served, parking, surrounding area, public access, known concerns, law enforcement outreach).

**Incident history:** Documented in `ThreatAssessment.incidentHistory` (per threat type). `SiteObservation` is for physical walkthrough findings.

---

## Naming conventions

### User-visible text
Always use **"site / sites"** — never "facility / facilities" in labels, toasts, breadcrumbs, descriptions, or button text.

### Internal code names (do not rename)
Some internal names were established early and are kept as-is to avoid churn:
- `facilitySchema`, `FacilityInput` — in `src/lib/validations.ts`
- `getFacility()`, `createFacility()` — in `src/actions/sites.ts`
- Local variables inside server actions may be named `facility` (the local result of `prisma.site.findUnique`)

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
- `font-serif` / `font-heading` → Fraunces (display headings)
- `font-sans` → Geist Sans (body)
- `font-mono` → Geist Mono (numbers, codes, tabular data)

**Eyebrow text:** `<p className="eyebrow">` — small uppercase tracking label above headings.

---

## Component patterns

### Server vs client
- Pages are **server components** by default (fetch data with Prisma directly)
- Mark `'use client'` only for interactive components (forms, modals, client state)
- Server actions are in `src/actions/` and use `'use server'`

### Common layout pattern
```tsx
<div>
  <Header breadcrumbs={[...]} />
  <div className="px-8 pb-16 max-w-[960px]">
    {/* page content */}
  </div>
</div>
```

### Site listing — overlay link pattern
The `/sites` page uses an overlay `<Link>` to allow two independent click targets (map thumbnail → Google Maps, rest of row → site detail):
```tsx
<div className="... group relative">
  <div className="w-[160px] ..." style={{ borderRight: '1px solid var(--rule)' }}>
    <SiteMap address={site.address} /> {/* <a> to Google Maps */}
  </div>
  <Link href={`/sites/${site.id}`} className="absolute inset-0" style={{ left: 160 }} />
  <div className="flex-1 ... pointer-events-none"> {/* info panel */} </div>
</div>
```

### Risk score helpers
```ts
import { calculateRiskScore, getRiskLevel, formatCurrency } from '@/lib/scoring'
// getRiskLevel returns 'low' | 'medium' | 'high' | 'critical'
```

### AI assist
`<AiAssistTextarea>` in `src/components/shared/ai-assist-textarea.tsx` — wrap any long-form field to get AI drafting. Pass `context` object and `fieldLabel`.

---

## Prisma / database notes

- Local dev uses plain **SQLite** (no adapter needed)
- Production uses **Turso** (libSQL) — adapter is wired in `src/lib/prisma.ts`
- After schema changes: `npx prisma db push` (dev) or migration for prod
- Seed: `npm run prisma:seed` (ts-node based)
- All cascade deletes are set — deleting an org removes all its sites and children

---

## Environment variables

Check `.env.local` for:
- `DATABASE_URL` — Turso URL for production
- `DATABASE_AUTH_TOKEN` — Turso auth token
- `ANTHROPIC_API_KEY` — for AI assist and analyzer features
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — auth

---

## Things to avoid

- Do **not** nest `<a>` inside `<Link>` (or `<a>` inside `<a>`) — use the overlay pattern instead
- Do **not** use "facility/facilities" in any user-facing string
- Do **not** rename `facilitySchema`, `FacilityInput`, `getFacility`, or `createFacility` — these internal names are stable
- Do **not** run bulk regex replacements across template literals — `${facility.id}` inside backtick strings will get corrupted
- Do **not** `rm -rf .next` unless diagnosing stale type errors — it forces a full rebuild
- Do **not** add dark mode styles — the palette is light-only by design
