# npsg-builder — Project Memory

_Last updated: 2026-05-02_

---

## What This App Does
NSGP Builder helps Jewish nonprofits and houses of worship prepare Nonprofit Security Grant Program (NSGP) applications. It manages sites, threat assessments, security measures, project proposals, site observations, narratives, and grant filing documents.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript (strict) |
| Database | Turso (libSQL / SQLite-compatible, cloud) |
| ORM | Prisma 7.6 with `@prisma/adapter-libsql` |
| Auth | NextAuth v4 — Google OAuth + email allowlist |
| Styling | Tailwind CSS v4 + shadcn/ui components |
| Forms | react-hook-form + Zod v4 |
| Validation | Zod at all server action trust boundaries |
| Toasts | Sonner |
| Icons | lucide-react |
| Deployment | Vercel (deploys from `main` branch) |

---

## Repository & Branch Strategy

- **Remote**: `https://github.com/sbrazzell/npsg-builder.git`
- **Development branch**: `develop` — all feature work goes here
- **Production branch**: `main` — Vercel deploys from this branch
- **To ship**: merge `develop → main` then push both

---

## Database

- **Adapter**: `@prisma/adapter-libsql` with `@libsql/client`
- **Connection env vars**: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- **Schema**: `prisma/schema.prisma`

### Prisma Models
`AllowedUser`, `ApplicationDraft`, `ApplicationPacket`, `ApplicationReview`, `BudgetItem`, `ExistingSecurityMeasure`, `GrantAnalysis`, `GrantAnalysisFlag`, `NarrativeDraft`, `Organization`, `ProjectAnalysisSnapshot`, `ProjectProposal`, `ProjectThreatLink`, `Site`, `SiteObservation`, `ThreatAssessment`

---

## Field-Level Encryption

Sensitive fields are transparently encrypted via a Prisma `$extends` query extension in `src/lib/prisma.ts`.

**Wire format**: `enc:<iv_b64>:<authTag_b64>:<ciphertext_b64>`

**Encrypted fields:**
```
Organization     → einOrTaxId
Site             → lawEnforcementFindings
ThreatAssessment → vulnerabilityNotes, incidentHistory
ApplicationDraft → snapshotJson
```

**Key facts:**
- Key lives in `FIELD_ENCRYPTION_KEY` env var (AES-256-GCM)
- `decrypt()` returns plaintext unchanged if value doesn't start with `enc:` (migration safety)
- Throws "Unsupported state or unable to authenticate data" if data was encrypted with a different key
- Nested Prisma includes bypass the model-level middleware — raw queries on nested relations won't auto-decrypt
- Diagnostic script: `prisma/diagnose-encryption.ts`

---

## Authentication

- Provider: Google OAuth via NextAuth v4
- Access control: DB-backed `AllowedUser` table (not env var email list)
- Three-layer defense: edge middleware → server action guard → API route guard
- Session stored as JWT; 24hr expiry

---

## Key Environment Variables

```
TURSO_DATABASE_URL        # libSQL database URL
TURSO_AUTH_TOKEN          # Turso auth token
FIELD_ENCRYPTION_KEY      # AES-256-GCM key (base64, 32 bytes)
NEXTAUTH_URL              # e.g. https://your-app.vercel.app
NEXTAUTH_SECRET           # Random secret for JWT signing
GOOGLE_CLIENT_ID          # Google OAuth client ID
GOOGLE_CLIENT_SECRET      # Google OAuth client secret
NARRATIVE_PROVIDER        # "template" (default) or "anthropic"
ANALYZER_PROVIDER         # "rules" (default), "anthropic", or "openai"
ANTHROPIC_API_KEY         # Optional — for LLM narrative/analysis features
```

---

## Important Patterns & Gotchas

### Count Bugs
Never use `take: N` on a relation include when you need an accurate count for display. Use `select: { id: true }` instead — this fetches all IDs cheaply without capping `.length`.

```ts
// ❌ Wrong — caps .length at 3
siteObservations: { orderBy: { createdAt: 'desc' }, take: 3 }

// ✅ Correct — accurate count
siteObservations: { select: { id: true } }
```

### Seed Scripts (ts-node)
Project uses `moduleResolution: "bundler"` in tsconfig, which ts-node doesn't support. Override inline:
```bash
npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/your-script.ts
```

### Server Actions
Prefer server actions over API routes for mutations. Every server action must verify session as its first operation.

### Inline Edit Pattern
For inline editing in list views, lift editing state to a card-level client component so the form renders at full card width (not inside a narrow flex cell). See `ObservationCard` in `src/app/(app)/sites/[id]/observations/observation-card.tsx`.

---

## Key Directories

```
src/
  app/
    (app)/          # Authenticated app routes
      sites/        # Site management (threats, measures, projects, observations, narratives, filings)
      organizations/ # Org management
      dashboard/    # Main dashboard
    api/            # API routes (auth, etc.)
  actions/          # Server actions (mutations)
  components/
    layout/         # Header, nav
    shared/         # PageHeader, EmptyState, RiskBadge, etc.
    ui/             # shadcn/ui primitives
  lib/
    prisma.ts       # Prisma client with encryption extension
    encryption.ts   # AES-256-GCM helpers
    scoring.ts      # Risk score calculation
prisma/
  schema.prisma
  migrations/
  seed-*.ts         # Seed scripts (run with ts-node CommonJS override)
```

---

## Notable History

- **Encryption key rotation incident (2026-04)**: Two records (Grace Community Church `lawEnforcementFindings`, Draft v5 `snapshotJson`) were encrypted with an old key, causing dashboard crash. Fixed by nulling out those fields after identifying them with `prisma/diagnose-encryption.ts`.
- **CPTED seeding (2026-04)**: Rock Hill Police Department CPTED Site Survey (April 24, 2026) seeded into all three Park Baptist Church sites via `prisma/seed-cpted-assessment.ts`.
