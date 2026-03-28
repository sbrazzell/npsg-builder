# NSGP Builder

**Nonprofit Security Grant Program Application Builder**

NSGP Builder is a full-stack, local-first web application for security consultants, nonprofit administrators, and grant writers who need to build comprehensive FEMA Nonprofit Security Grant Program (NSGP) applications. All data is stored locally in a SQLite database — no cloud accounts, no subscriptions, no data leaving your machine.

---

## What Is NSGP Builder?

The FEMA Nonprofit Security Grant Program provides funding to nonprofit organizations at high risk of terrorist attack. Applications require detailed threat assessments, vulnerability analyses, project proposals, budget justifications, and professional-quality narratives. NSGP Builder guides you through each section and helps generate polished first-draft narratives using template-based generation (with hooks for future AI providers like OpenAI or Anthropic).

### Key Features

- **Organization & Facility Management** — Manage multiple organizations and facilities with detailed profiles including occupancy, population served, site characteristics, and known concerns.
- **Threat Assessment** — Document threats using a 5x5 likelihood/impact risk matrix with automatic risk scoring and visual threat matrix.
- **Security Measure Inventory** — Catalog existing security infrastructure with effectiveness ratings and gap analysis.
- **Project Proposals** — Build grant-ready project proposals with problem statements, proposed solutions, risk reduction rationale, and threat linkage.
- **Budget Builder** — Line-item budget builder with quantity, unit cost, vendor information, and justification fields.
- **Narrative Studio** — Template-based narrative generation for 6 key application sections (Executive Summary, Threat Overview, Vulnerability Statement, etc.). Designed to accept AI providers in the future.
- **Site Observations** — Field observation log for site walkthrough findings with severity rating.
- **Review & Scorecard** — Automated readiness checker with completeness scores and warning flags before submission.
- **Export** — Full printable HTML export and Markdown download of the complete application draft.

---

## Prerequisites

- Node.js 18+
- npm 9+

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url> npsg-builder
cd npsg-builder
npm install
```

### 2. Run database migrations

```bash
npx prisma migrate dev
```

This creates `dev.db` in the project root.

### 3. Seed with demo data (optional)

```bash
npx prisma db seed
```

This populates the database with a complete demo application for **Grace Community Church** — a realistic urban church with 5 threats, 4 security measures, 3 project proposals, line-item budgets, site observations, and narrative drafts. Use it to explore all features.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Configuring Narrative Providers

By default, NSGP Builder uses a **template-based** narrative generator that produces professional first drafts based on the data you have entered. No API key is required.

To use an AI provider, edit `.env`:

```env
NARRATIVE_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
```

or

```env
NARRATIVE_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
```

> **Note:** The OpenAI and Anthropic implementations are placeholder hooks in `src/lib/narratives.ts`. You will need to add the API call logic when enabling these providers.

---

## Project Structure

```
src/
  app/                        # Next.js App Router pages
    page.tsx                  # Dashboard
    organizations/            # Organization CRUD
    facilities/               # Facility CRUD and all sub-modules
      [id]/
        threats/              # Threat assessments
        measures/             # Security measures
        projects/             # Project proposals
          [projectId]/
            budget/           # Budget line items
        narratives/           # Narrative studio
        observations/         # Site observations
        review/               # Readiness scorecard
        export/               # Print/download export
    settings/                 # App settings
  components/
    ui/                       # shadcn/ui components
    layout/                   # Sidebar, header, breadcrumbs
    shared/                   # Reusable components (RiskBadge, EmptyState, etc.)
  lib/
    prisma.ts                 # Prisma client singleton
    scoring.ts                # Risk scoring utilities
    narratives.ts             # Narrative generation (template + AI hooks)
    validations.ts            # Zod validation schemas
  actions/                    # Next.js Server Actions
    organizations.ts
    facilities.ts
    threats.ts
    measures.ts
    projects.ts
    budget.ts
    narratives.ts
    observations.ts
prisma/
  schema.prisma               # Database schema
  seed.ts                     # Demo data seed
  migrations/                 # Migration history
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (base-ui) |
| Database | SQLite via Prisma 7 + better-sqlite3 adapter |
| Validation | Zod v4 |
| Forms | react-hook-form |
| Charts | recharts |
| Icons | lucide-react |

---

## Production Build

```bash
npm run build
npm start
```

---

## License

MIT
