# CLAUDE.md — npsg-builder

## What this project is

A grant application builder for the **Nonprofit Security Grant Program (NSGP)**, a FEMA program that funds physical security improvements at houses of worship and other nonprofits at risk of terrorism or targeted violence.

Users (grant writers / security consultants) manage **Organizations** → **Sites** → Threats, Security Measures, Projects, Budget Items, and AI-generated Narratives, then export a complete grant packet as a clean PDF.

---

## Branch strategy

| Branch | Purpose |
|---|---|
| `develop` | Active development — all new features land here |
| `main` | Stable releases only — merge from `develop` when ready to ship |

**Flow:** work on `develop` → test → merge to `main` → tag version (e.g. `v1.1.0`) → push → Vercel auto-deploys from `main`.

Current version: **v1.3.1** on `main`. All new work goes to `develop`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.4 (App Router, React 19) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (PostCSS), shadcn/ui, Base UI |
| ORM | Prisma 7 |
| DB (local) | SQLite (`dev.db`) — applied via `sqlite3 dev.db "ALTER TABLE..."` |
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
sqlite3 dev.db "ALTER TABLE ..." # Apply schema changes locally (prisma.config.ts uses Turso)
DATABASE_URL="file:./dev.db" npx prisma generate  # Regenerate client after schema change
npx prisma studio        # Visual DB browser
npm run lint             # ESLint
npm test                 # Vitest (unit tests)
npm run test:watch       # Vitest watch mode
```

> **Always run `npx tsc --noEmit` before committing.** Clear `.next/` with `rm -rf .next` first if you see stale type errors — but only when the dev server is stopped.

### Local DB note
`prisma.config.ts` always points to `TURSO_DATABASE_URL`. For local schema changes, apply migrations directly to `dev.db` with `sqlite3`, then regenerate the Prisma client with the `file:` URL override. Do NOT run `npx prisma db push` locally — it will error on the libsql:// URL.

---

## Route structure

The app uses **Next.js route groups**:

- **`(app)/`** — all main app pages, wrapped in the sidebar + sticky header layout
- **`(print)/`** — print-only pages, no sidebar/header/chrome
- **`api/`** — API routes (no layout)

```
/                               → dashboard
/guide                          → 10-step NSGP grant guide (all app features)
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
/sites/[id]/filings/[draftId]/review → agentic Review My Application workflow
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
AllowedUser                              — access control (email, role admin/member)

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
        │     └── ApplicationReview (many) — agentic review runs (scores, findings, fixes)
        ├── ApplicationPacket (many)
        └── GrantAnalysis (many)           — AI scoring + flags
```

**Key Site fields:** `siteName`, `targetCycleYear` (Int, default 2026), `address`, `sitePhotoUrl` (String?, stored in Vercel Blob), `organizationId`, plus narrative fields (occupancy, population served, parking, surrounding area, public access, known concerns, law enforcement outreach).

**Key ProjectProposal fields (added in `develop`):**
- `timelineJson String?` — JSON-encoded `TimelineData` (structured timeline inputs)
- `sustainmentJson String?` — JSON-encoded `SustainmentData` (structured sustainment inputs)
- `timelineNarrative String?` — user-authored override (highest priority, replaces generated)
- `sustainmentNarrative String?` — user-authored override

**`FilingSnapshot`** (`src/actions/filings.ts`) — the JSON type stored in `ApplicationDraft.snapshotJson`. Contains a point-in-time copy of org, site, threats, securityMeasures, projects (with budgetItems + generated narratives), narratives, totalBudget. Snapshots are immutable once saved; backward-compat backfills are applied at read time.

**Key FilingSnapshot project fields (auto-generated at snapshot build time):**
- `implementationNarrative: string` — always populated (generated from project type if not user-authored)
- `implementationSource: NarrativeSource` — `'user'` | `'structured'` | `'inferred'`
- `timelineNarrative: string` — always populated
- `sustainmentNarrative: string` — always populated
- `timelineSource` / `sustainmentSource: NarrativeSource`
- `generationWarnings: string[]`

### FilingSnapshot backward compatibility rules
Old snapshots may be missing fields added after they were saved. Always apply these backfills at read time (both in the detail page and the print page):
- `snapshot.site` — backfill from live `facility` record if null
- `project.generationWarnings` — use `?.length ?? 0` (not `.length`) — field absent on pre-feature snapshots
- `project.timelineNarrative` / `sustainmentNarrative` / `implementationNarrative` — may be undefined; treat as empty string

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

The print button in `draft-tabs.tsx` opens the clean print URL in a new tab:
```ts
window.open(`/sites/${params.id}/filings/${params.draftId}/print`, '_blank')
```

### Forms (all in `src/app/(app)/sites/[id]/filings/[draftId]/`)
| File | Content |
|---|---|
| `form-sf424.tsx` | SF-424 federal application form |
| `form-investment-justification.tsx` | IJ narrative — Part 1 (applicant), 2 (threats), 3 (projects + generated narratives), 4 (implementation) |
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
- `warning` — missing project sections, generic item names, empty budget, generation warnings
- `info` — NOFO-dependent fields (districts, dates, rep title), auto-generated timeline/sustainment (prompts review)

A draft is never `submission-ready` as long as NOFO-dependent `info` issues exist.

**Timeline/Sustainment validation codes:**
- `PROJ_NO_TIMELINE` / `PROJ_NO_SUSTAINMENT` — warning if narrative is blank
- `PROJ_TIMELINE_AUTO_GENERATED` / `PROJ_SUSTAINMENT_AUTO_GENERATED` — info if source is `'inferred'`
- `PROJ_GENERATION_WARNING` — warning for missing vendor names, ambiguous project type
- `PROJ_TIMELINE_VAGUE` / `PROJ_SUSTAINMENT_VAGUE` — warning for TBD / placeholder language (only checked on non-empty narratives)

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
5. Project × Section completeness matrix (including Timeline/Sustainment with source badges: User / Generated / Auto)

---

## Narrative generation engine (`src/lib/project-narrative-engine.ts`)

Generates formal, FEMA-appropriate Timeline and Sustainment paragraphs for every project. **Always produces complete text — never returns empty.** Called in `buildSnapshot()` so generated narratives are embedded in the saved snapshot.

### Priority chain (highest → lowest)
1. `timelineNarrative` / `sustainmentNarrative` on project — user-authored override
2. `timelineData` / `sustainmentData` on project — structured JSON fields → generate paragraph
3. Auto-inferred from `detectProjectType()` → default structured values → generate paragraph

### Project types detected
```ts
type ProjectType = 'lighting' | 'cctv' | 'access_control' | 'general'
```
Detection scans title + category + budget item names against regex pattern banks. Higher match count wins.

### Structured data types
```ts
interface TimelineData {
  procurementStartDaysAfterAward: number  // default 30
  procurementDurationDays: number         // default 30
  contractorSelectionRequired: boolean
  permittingRequired: boolean
  installationDurationDays: number        // type-specific defaults
  testingDurationDays: number             // default 5
  trainingRequired: boolean               // default true
  trainingDurationDays: number            // default 2
  finalDocumentationDays: number          // default 5
  responsibleParty: string
}

interface SustainmentData {
  maintenanceOwner: string
  inspectionFrequency: 'monthly' | 'quarterly' | 'annually'
  vendorSupport: boolean
  warrantyTermYears: number
  budgetOwner: string
  trainingRefreshFrequency: 'annually' | 'biannually' | 'as_needed'
  recordkeepingRequired: boolean          // default true
}
```

### Type-specific sustainment language
- **lighting** — fixture inspection, photocell/timer verification, bollard/barrier integrity
- **cctv** — camera angle/coverage checks, NVR storage, firmware updates, credential audits
- **access_control** — credential audits, door hardware/closer/latch testing, intercom testing, panic button verification

### Source labels in snapshot and UI
```ts
type NarrativeSource = 'user' | 'structured' | 'inferred'
```
`FilingSnapshot` project fields: `timelineSource`, `sustainmentSource`, `generationWarnings: string[]`

In the IJ form, `systemGap` sections are gone. Timeline and Sustainment always render with content. A small badge shows `AUTO-GENERATED` (inferred) or `GENERATED` (structured) — nothing if user-authored.

### Generation warnings (in snapshot, shown in IJ form screen-only)
- No vendor names in any budget item
- Project type fell through to `'general'` (no pattern matches)

---

## Tests

```bash
npm test               # run all tests once
npm run test:watch     # watch mode
```

Tests live in `src/__tests__/`. Currently **208 tests** across 3 files:

| File | Count | Covers |
|---|---|---|
| `export-validation.test.ts` | 45 | placeholder detection, district flags, project section completeness, budget math, generic item names, document status transitions, timeline/sustainment/implementation validation codes |
| `project-narrative-engine.test.ts` | 108 | type detection, timeline/sustainment/implementation narrative generation, project-type-specific language, priority chain, vague text detection, SF-424 auth rep classification |
| `application-review.test.ts` | 55 | completeness blockers, threat quality, budget generic-item autofix, scoring, applyFixToSnapshot path parser, guardrail checks (no invented facts), full review structure |

Test setup: Vitest 4 + `@vitest/coverage-v8`, configured in `vitest.config.ts`. Path alias `@/` resolves to `src/`.

### Test fixture pattern
Use factory functions with overrides — never duplicate full objects:
```ts
function makeProject(overrides: Partial<FilingSnapshot['projects'][number]> = {}) { ... }
function makeSnapshot(overrides: Partial<FilingSnapshot> = {}) { ... }
```
Always include the new required fields (`timelineNarrative`, `sustainmentNarrative`, `implementationNarrative`, `timelineSource`, `sustainmentSource`, `implementationSource`, `generationWarnings`) in `makeProject()` defaults.

---

## Prisma / database notes

- Local dev uses plain **SQLite** (`dev.db`) — `prisma.config.ts` always points to Turso, so apply migrations manually: `sqlite3 dev.db "ALTER TABLE ..."`, then `DATABASE_URL="file:./dev.db" npx prisma generate`
- Production uses **Turso** (libSQL) — adapter is wired in `src/lib/prisma.ts`
- All cascade deletes are set — deleting an org removes all its sites and children
- Seed: `npm run prisma:seed` (ts-node based)

### Migration history
| Migration | Change |
|---|---|
| `20260328083641_init` | Initial schema |
| `20260328120000_add_grant_analysis` | GrantAnalysis + flags |
| `20260417124522_add_le_tracking_and_threat_source` | Law enforcement tracking, threat source |
| `20260417135317_add_application_drafts` | ApplicationDraft model |
| `20260418000000_rename_facility_to_site` | Facility → Site rename |
| `20260425000000_add_timeline_sustainment` | `timelineJson`, `sustainmentJson`, `timelineNarrative`, `sustainmentNarrative` on ProjectProposal |
| `20260425100000_add_application_review` | `ApplicationReview` model (scores, findings JSON, counters, FK to ApplicationDraft) |
| `20260425130000_add_allowed_user` | `AllowedUser` model (email, role, addedAt, addedBy) for DB-backed access control |

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `TURSO_DATABASE_URL` | ✅ | Turso libSQL URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | ✅ | Turso auth bearer token |
| `NEXTAUTH_SECRET` | ✅ | NextAuth JWT signing secret — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | App base URL (e.g. `https://npsg-builder.vercel.app`) |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `FIELD_ENCRYPTION_KEY` | ✅ prod | 64 hex-char (32-byte) AES-256-GCM key — generate with `openssl rand -hex 32`. If absent, sensitive fields are stored in plaintext (dev OK, **not OK in production**). |
| `ANTHROPIC_API_KEY` | optional | Claude API — required for AI assist and Anthropic-based analyzer/narratives |
| `OPENAI_API_KEY` | optional | OpenAI API — alternative AI provider |
| `BLOB_READ_WRITE_TOKEN` | optional | Vercel Blob — required for site photo uploads |
| `NARRATIVE_PROVIDER` | optional | `template` (default) \| `anthropic` \| `openai` |
| `ANALYZER_PROVIDER` | optional | `rules` (default) \| `anthropic` \| `openai` |
| `ALLOWED_EMAILS` | legacy | Comma-separated seed list — seeded into `AllowedUser` as admins on first sign-in, then ignored. Remove once users are in the DB. |

---

## Security architecture

### Auth flow
1. **Edge proxy** (`src/proxy.ts`) — runs on every request, checks NextAuth JWT via `getToken()`. Redirects to `/login` if absent. Exempts `/api/auth/*`, `/login`, `/_next/*`, `favicon.ico`. Next.js 16 uses `proxy.ts` (not `middleware.ts`) with a named `export async function proxy()`.
2. **Server action guard** (`src/lib/auth-guard.ts`) — `requireAuth()` is called as the first line of every exported function in every `src/actions/*.ts` file. Throws `UnauthorizedError` (HTTP 401) before any DB access. Never skip this call.
3. **API route guard** — `/api/ai/assist` and `/api/upload` call `getServerSession(authOptions)` directly and return 401 if no session.

```ts
// Pattern for every server action
import { requireAuth } from '@/lib/auth-guard'

export async function someAction(input: ...) {
  await requireAuth()          // ← always first
  // ... DB work
}
```

### Field-level encryption (`src/lib/encryption.ts`)
AES-256-GCM encryption is applied transparently via a Prisma `$extends` query extension in `src/lib/prisma.ts` (Prisma 5+ replaced the deprecated `$use` middleware API). The following fields are encrypted on write and decrypted on read:

| Model | Field |
|---|---|
| `Organization` | `einOrTaxId` |
| `Site` | `lawEnforcementFindings` |
| `ThreatAssessment` | `vulnerabilityNotes`, `incidentHistory` |
| `ApplicationDraft` | `snapshotJson` (contains all of the above + full application data) |

**Wire format:** `enc:<iv_b64>:<authTag_b64>:<ciphertext_b64>`  
**Key:** `FIELD_ENCRYPTION_KEY` env var (64 hex chars = 32 bytes). If not set, values pass through as plaintext (safe for dev, required in production).  
**Migration safety:** values without the `enc:` prefix are returned as-is — existing plaintext rows continue to work.  
**Key generation:** `openssl rand -hex 32`

```ts
import { encrypt, decrypt, encryptNullable, decryptNullable } from '@/lib/encryption'
```

### DB-backed allowlist (Option B)
Access control is managed through the `AllowedUser` table, not environment variables.

**`AllowedUser` schema:**
```prisma
model AllowedUser {
  id        String   @id @default(cuid())
  email     String   @unique
  role      String   @default("member")  // "admin" | "member"
  addedAt   DateTime @default(now())
  addedBy   String?
}
```

**Auth flow in `src/lib/auth.ts`:**
- `signIn` callback: checks `AllowedUser` table for the Google account email. Returns `false` (rejects sign-in) if not found.
- **Seed behaviour:** on first sign-in, if `AllowedUser` is empty AND `ALLOWED_EMAILS` is set, those emails are upserted as `admin` role. After seeding the env var is no longer consulted.
- `session` callback: looks up the user's `role` and attaches it to `session.user.role` so the UI can gate admin actions without a second DB call.
- **Session expiry:** JWT sessions expire after **24 hours** (`maxAge: 24 * 60 * 60` in `authOptions`). Users must re-authenticate daily.

**Server actions (`src/actions/allowed-users.ts`):**
```ts
listAllowedUsers()                        // returns AllowedUser[]
addAllowedUser({ email, role })           // admin only
removeAllowedUser(id)                     // admin only; guards: can't remove self, can't remove last admin
updateUserRole(id, role)                  // admin only; guard: can't demote self if last admin
```

**Settings UI** (`/settings` → `team-access-panel.tsx`):
- Admins see full table with role dropdowns + remove buttons + add-user form
- Members see read-only list
- Encryption status shown on the Database card

### Security headers (`next.config.ts`)
Applied to all routes via `headers()`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` — `unsafe-eval` is excluded in production (dev-only via `NODE_ENV` check); `unsafe-inline` retained for styles

---

## Application Review system (`src/lib/application-review/`)

Agentic, human-in-the-loop review workflow triggered from the draft detail page via "Review My Application" button.

### Architecture
```
src/lib/application-review/
  types.ts                    # All TS types (ReviewFinding, ApplicationReview, ProposedFix, …)
  utils.ts                    # Pure helpers: slug(), containsYearReference(), detectVagueTerms(), …
  checks/
    completeness.ts           # SF-424 fields, required project sections, budget items
    threat-quality.ts         # Threat depth, incident history, law enforcement, source agency
    vulnerability.ts          # Site exposure analysis, security measure gaps, population
    project-alignment.ts      # Project↔threat mapping, rationale specificity, budget math
    budget.ts                 # Generic item names (autofix), vendor/justification, zero cost
    implementation.ts         # Plan quality, vague language (autofix), contractor/testing mentions
    sustainment.ts            # Maintenance frequency (autofix), ownership, vague language (autofix)
    export-readiness.ts       # SF-424 signature reminders, attachment checklist prompts
  scorer.ts                   # Sub-score computation (0–100 each) + weighted overall
  runner.ts                   # Orchestrator: runs all checks, deduplicates, generates summary; applyFixToSnapshot()
  index.ts                    # Barrel export
```

### Review scores (weighted overall)
| Score | Weight | What it measures |
|---|---|---|
| `threat_evidence` | 18% | Threats present, high-risk threats, incident history, LE contact |
| `project_alignment` | 22% | Threat links, rationale quality, unaddressed high-risk threats, budget math |
| `budget_quality` | 20% | Specific item names, vendor names, justifications, math integrity |
| `vulnerability_specificity` | 15% | Site context, security measure gap analysis, threat vulnerability notes |
| `implementation_feasibility` | 12% | Narrative completeness, user-authored %, absence of vague language |
| `sustainment_quality` | 8% | Narrative completeness, maintenance schedule, ownership named |
| `attachment_readiness` | 5% | EIN, contact, email, budget math |

### Review status thresholds
- `incomplete` — any unresolved blockers
- `needs_review` — no blockers, overall < 50
- `strong_draft` — no blockers, overall 50–74
- `submission_ready_candidate` — no blockers, overall ≥ 75

### Autofix guardrails (non-negotiable)
- `canAutoFix: false` for ALL of: incident history, vendor quotes, police reports, certifications, 501(c)(3), SAM/UEI, law enforcement endorsements
- Budget item renames: `requiresEvidenceConfirmation: true` — user MUST edit before accepting
- Only vague-language rewrites run without confirmation (no facts involved)
- `applyFixToSnapshot()` path parser supports: `organization.<field>`, `site.<field>`, `projects[<id>].<field>`, `projects[<id>].budgetItems[<id>].<field>`

### Server actions (`src/actions/application-review.ts`)
```ts
runReview(draftId)                    // run fresh review, persist to DB, return ApplicationReview
getLatestReview(draftId)              // load most recent review
getReviewHistory(draftId)             // lightweight history entries (no full JSON)
acceptFix(reviewId, findingId, editedText?)  // patch snapshot + mark finding resolved (one transaction)
rejectFinding(reviewId, findingId)    // mark finding rejected (no snapshot change)
markFindingResolved(reviewId, findingId)     // mark manually resolved
```

### UI components (`src/app/(app)/sites/[id]/filings/[draftId]/review/`)
- `page.tsx` — server component; loads latest review + history, renders ReviewClient
- `review-client.tsx` — Run/Re-run bar, status badge, score dashboard, summary panel, findings list with severity/category filters, history table
- `score-dashboard.tsx` — 8 color-coded score bars with weight labels
- `finding-card.tsx` — collapsible card; expand shows explanation + recommended action + proposed-fix panel (Accept / Edit before accepting / Dismiss / Mark resolved manually)

---

## PDF pagination (print route)

CSS print rules live in the `<style>` block inside `src/app/(print)/sites/[id]/filings/[draftId]/print/page.tsx` — this is the only place global print CSS can be injected for the print route group.

### Classes and their rules
| Class | Rule | Purpose |
|---|---|---|
| `.ij-section-heading` | `break-after: avoid` | Keep IJ section headings glued to first content |
| `.project-card-header` | `break-after: avoid` | Keep IJ project header bar glued to narrative |
| `.project-section-card` | `break-inside: avoid` | Keep individual IJ narrative cards together |
| `.budget-section-heading` | `break-after: avoid` | Keep budget section A/B/C/D headings glued to first content |
| `.budget-project-header` | `break-after: avoid` | Keep budget project header bar glued to its table |
| `.checklist-row`, `.warning-box` | `break-inside: avoid` | Keep checklist rows and warning boxes together |
| `thead` | `display: table-header-group` | Repeat table header on each page |
| `tbody tr` | `break-inside: avoid` | Prevent rows from splitting mid-row |

**Key rule:** Do NOT put `pageBreakInside: avoid` on the outer project card div in `form-budget.tsx` — it causes large blank spaces when a card is too tall to fit. Apply `break-after: avoid` on the header bar only.

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
- Do **not** access `project.generationWarnings.length` directly — use `project.generationWarnings?.length ?? 0`. Old snapshots (pre-feature) don't have this field.
- Do **not** run `detectVagueText()` on empty strings — check `if (text.trim())` first. Empty = missing, not vague.
- Do **not** run `npx prisma db push` locally — `prisma.config.ts` uses `TURSO_DATABASE_URL` and will fail. Apply migrations to `dev.db` with `sqlite3` directly.
- Do **not** leave JSX table tags (`</tbody>`, `</table>`) out of place — a missing close tag inside a `.map()` return causes a parse error that surfaces as a 404 on the route, not a helpful compile error in the browser.
- Do **not** apply `pageBreakInside: avoid` to entire project card divs in `form-budget.tsx` — it causes large blank gaps on printed pages. Apply `break-after: avoid` to the header bar only.
- Do **not** invent facts in autofix proposals (incidents, vendor quotes, police reports, certifications, SAM/UEI, 501(c)(3), board resolutions, law enforcement endorsements). If evidence is needed, set `requiresEvidenceConfirmation: true` and `canAutoFix: false`.
- Do **not** add a new server action without calling `await requireAuth()` as its first line — unauthenticated DB access is the #1 attack surface.
- Do **not** add a new API route handler without calling `getServerSession(authOptions)` and returning 401 if the session is absent.
- Do **not** rename `src/proxy.ts`, change its exported function name away from `proxy`, or remove the `export const config` matcher — the auth gateway will silently stop running. Next.js 16 requires `proxy.ts` exporting `async function proxy()`. Do not revert to `middleware.ts` or rename the export to `middleware`.
- Do **not** add new sensitive fields to the DB schema without also adding them to `ENCRYPTED_FIELDS` in `src/lib/prisma.ts`.
- Do **not** set `FIELD_ENCRYPTION_KEY` to the same value in multiple environments — each environment should have its own key.
- Do **not** use `ALLOWED_EMAILS` as the long-term access control mechanism — it is only a seed source. Manage users via `/settings`.
