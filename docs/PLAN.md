# Name.ai Insights Portal — Implementation Plan

Stack: **Next.js 16.2.10 (App Router, Turbopack)** · **TypeScript** · **Tailwind v4** · **Prisma** · **Supabase Postgres**

---

## 0. Current state of the repo

| Thing | Status |
| --- | --- |
| Next.js | 16.2.10, App Router, Turbopack is the default bundler |
| Layout | `app/` at **repo root** (not `src/app`) |
| Styling | Tailwind v4 via `@tailwindcss/postcss`, `app/globals.css` |
| tsconfig | `paths: { "@/*": ["./*"] }` |
| DB / ORM | none yet |
| Content | none — default Next starter page |

### Next.js 16 gotchas that affect this build

These differ from most Next.js material you'll find online:

1. **`params` and `searchParams` are Promises.** Sync access was removed in 16.
   ```tsx
   export default async function Page(props: PageProps<'/insights/[slug]'>) {
     const { slug } = await props.params
   }
   ```
   `PageProps` / `LayoutProps` / `RouteContext` are **globally available** generated types — run `npx next typegen` (also produced by `next dev` / `next build`).
2. **`revalidateTag` now takes two args**: `revalidateTag('articles', 'max')`. Single-arg form is a TS error.
3. **`middleware.ts` → `proxy.ts`** (function renamed to `proxy`, Node runtime only).
4. **Route handlers are uncached by default.** Opt in with `export const dynamic = 'force-static'`, or with Cache Components use `use cache` in an extracted helper (it cannot appear directly in the handler body).
5. **Cache Components / PPR** is now the `cacheComponents: true` config flag; `experimental.ppr` and `experimental_ppr` are gone.
6. `cacheLife` / `cacheTag` are stable — import from `next/cache` without the `unstable_` prefix.
7. Node.js **20.9+** required.

> **Caching decision for this project:** do **not** enable `cacheComponents` in Phase 1. Use the classic model (`export const revalidate`, `revalidatePath`, `dynamicParams`) documented in `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`. This stayed the right call even after Phase 3/4 landed: article reads go through Payload's API (`force-dynamic` pages + `fetch`'s own `next: { revalidate }`, not a local cache to invalidate) — see § 5.

---

## 1. Architecture

```
 NameBio / DNJournal        TechCrunch / VentureBeat / Google News RSS
        │                                  │
        ▼                                  ▼
 services/domain-sales/*.ts         services/funding/*.ts
        │  (fetch → parse → zod-validate → normalize)
        ▼
   RAW TABLES:  domain_sales  ·  funding_events        ← source of truth
        │
        ▼
   report builder (Phase 1: manual/deterministic · Phase 2: LLM)
        │
        ▼
   articles  (title, slug, summary, contentMd, metrics)
        │
        ▼
   Next.js  /  ·  /insights  ·  /insights/[slug]
```

**The core principle (your own suggestion — keep it):** raw rows are never owned by an article. `article_id` is *nullable*, and every raw row also carries a `report_date`. That means an article can be deleted and regenerated from the same raw rows any number of times, and the raw data stays usable for charts, filters, and analytics independent of any article.

---

## 2. Project structure (target)

Move `app/` → `src/app` in step 3.1, then:

```
prisma/
  schema.prisma
  migrations/
  seed.ts
src/
  app/
    layout.tsx
    page.tsx                     # homepage: latest reports
    insights/
      page.tsx                   # article index (+ ?type= filter)
      [slug]/page.tsx            # article detail
      loading.tsx  not-found.tsx
    api/
      articles/route.ts          # GET list
      articles/[slug]/route.ts   # GET one
      domain-sales/route.ts      # GET raw sales (filters)
      funding/route.ts           # GET raw funding
    # Phase 3 automation is an in-process scheduler instead — see § 5, no cron/ routes
  components/
    ui/            # Button, Card, Badge, Table, Prose
    insights/      # ArticleCard, SalesTable, FundingTable, StatTile, TypeFilter
    layout/        # SiteHeader, SiteFooter
  db/
    client.ts                    # Prisma singleton
    queries/articles.ts  domain-sales.ts  funding.ts
  services/
    domain-sales/
      namebio.ts  dnjournal.ts  index.ts  types.ts
    funding/
      rss.ts  techcrunch.ts  google-news.ts  extract.ts  index.ts  types.ts
    shared/
      http.ts  dedupe.ts  money.ts  dates.ts
  reports/
    domain-sales-report.ts       # raw rows → { title, summary, markdown, metrics }
    funding-report.ts
  lib/
    slug.ts  markdown.ts  format.ts  env.ts
  types/
scripts/
  ingest.ts                      # tsx scripts/ingest.ts --source=domain-sales --date=…
  build-report.ts
docs/PLAN.md
```

`tsconfig.json` must change with the move: `"@/*": ["./src/*"]`.

---

## 3. Phase 1 — MVP (fetch → store → display)

No AI. No CMS. No cron. Target: ~1 week of focused work.

### 3.1 Scaffolding

```bash
npm i prisma @prisma/client zod rss-parser cheerio date-fns
npm i -D tsx @types/node
npx prisma init --datasource-provider postgresql
```

Move to `src/`:
```bash
mkdir src && git mv app src/app
# then edit tsconfig paths → "@/*": ["./src/*"]
```

`.env` (Supabase → Project Settings → Database → Connection string):
```bash
# Transaction pooler (port 6543) — used by the app at runtime
DATABASE_URL="postgresql://postgres.PROJECT:PASS@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Direct connection (port 5432) — used by prisma migrate / db push only
DIRECT_URL="postgresql://postgres.PROJECT:PASS@aws-0-REGION.pooler.supabase.com:5432/postgres"
```
Both are required. Prisma's migration engine cannot run through PgBouncer; the app must not use the direct connection or you will exhaust Supabase connections on a serverless host.

### 3.2 Database schema

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum ArticleType   { DOMAIN_SALES FUNDING }
enum ArticleStatus { DRAFT PUBLISHED ARCHIVED }

model Article {
  id          String        @id @default(cuid())
  slug        String        @unique
  title       String
  type        ArticleType
  reportDate  DateTime      @db.Date          // the day the report covers
  summary     String?
  contentMd   String?       @db.Text          // markdown, rendered at read time
  coverImage  String?
  status      ArticleStatus @default(DRAFT)
  metrics     Json?                           // { totalVolume, avgPrice, saleCount, topSale }
  publishedAt DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  domainSales   DomainSale[]
  fundingEvents FundingEvent[]

  @@unique([type, reportDate])                // one report per type per day
  @@index([status, publishedAt(sort: Desc)])
  @@index([type, publishedAt(sort: Desc)])
  @@map("articles")
}

model DomainSale {
  id          String   @id @default(cuid())
  articleId   String?                          // nullable on purpose
  article     Article? @relation(fields: [articleId], references: [id], onDelete: SetNull)

  domain      String
  tld         String                           // "ai" — lets you filter/expand later
  price       Decimal  @db.Decimal(14, 2)
  currency    String   @default("USD")
  priceUsd    Decimal  @db.Decimal(14, 2)      // normalized for sorting/aggregates
  saleDate    DateTime @db.Date
  reportDate  DateTime @db.Date
  marketplace String?                          // "NameBio", "Sedo", "GoDaddy"
  source      String                           // fetcher id
  sourceUrl   String?
  raw         Json?                            // untouched payload, for reprocessing
  createdAt   DateTime @default(now())

  @@unique([domain, saleDate, marketplace])    // idempotent upsert key
  @@index([reportDate, priceUsd(sort: Desc)])
  @@index([saleDate(sort: Desc)])
  @@map("domain_sales")
}

model FundingEvent {
  id               String   @id @default(cuid())
  articleId        String?
  article          Article? @relation(fields: [articleId], references: [id], onDelete: SetNull)

  company          String
  companySlug      String                       // normalized, for dedupe
  amount           Decimal? @db.Decimal(16, 2)
  currency         String   @default("USD")
  amountUsd        Decimal? @db.Decimal(16, 2)
  round            String?                      // "Seed" | "Series A" | …
  investors        String[]                     // Postgres text[]
  leadInvestor     String?
  country          String?
  announcementDate DateTime @db.Date
  reportDate       DateTime @db.Date
  source           String
  sourceUrl        String   @unique             // dedupe key across feeds
  headline         String?
  raw              Json?
  createdAt        DateTime @default(now())

  @@index([reportDate, amountUsd(sort: Desc)])
  @@index([companySlug, announcementDate])
  @@map("funding_events")
}

model IngestRun {
  id         String    @id @default(cuid())
  source     String
  status     String                             // running | success | failed
  itemsFound Int       @default(0)
  itemsSaved Int       @default(0)
  error      String?   @db.Text
  startedAt  DateTime  @default(now())
  finishedAt DateTime?

  @@index([source, startedAt(sort: Desc)])
  @@map("ingest_runs")
}

model ApiUsage {
  id          String   @id @default(cuid())
  provider    String                            // "predictleads"
  period      String                            // "2026-07" — calendar month, matches billing reset
  creditsUsed Int      @default(0)
  creditsCap  Int                                // 100 on PredictLeads' free tier
  updatedAt   DateTime @updatedAt

  @@unique([provider, period])
  @@map("api_usage")
}
```

Schema notes worth knowing before you run the migration:

- **Money as `Decimal`, never `Float`.** Prisma returns `Decimal` objects — serialize with `.toString()` / `Number()` before passing to a Client Component, since Decimal isn't JSON-serializable across the RSC boundary.
- **`priceUsd` / `amountUsd`** exist so `ORDER BY` and `SUM` are meaningful when a non-USD sale appears. In Phase 1 just copy the value when currency is USD.
- **Unique keys are the dedupe strategy.** `upsert` on them makes ingestion re-runnable without duplicates — essential once cron retries exist.
- `raw Json` lets you re-parse history after you fix a parser bug, without re-fetching.
- RLS: keep it **enabled** on all tables in Supabase with no public policies. Prisma connects as the `postgres` role and bypasses RLS; this just guarantees the anon key can't read anything if it ever leaks.

```bash
npx prisma migrate dev --name init
```

### 3.3 Prisma client singleton

`src/db/client.ts` — required so Next.js dev hot-reload doesn't open a new pool per reload:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 3.4 Data sources — the honest assessment

**Domain sales.** This is the hard part, exactly as you guessed.

| Option | Reality |
| --- | --- |
| NameBio API | Not a public self-serve API. Requires a paid/negotiated arrangement. **Email them** — this is the only clean path and worth doing on day 1 since it has the longest lead time. |
| NameBio scraping | Their ToS prohibits it. Legal/blocking risk. Do not build the product on this. |
| **DNJournal** | Publishes a weekly top-sales chart publicly. Free, stable HTML, low volume, weekly not daily. Good fallback. |
| **Sedo / Afternic / Dynadot public sale reports** | Each publishes some public results; several have RSS or a stable HTML table. |
| Crunch.id | Worth evaluating for coverage + terms. |
| **Manual CSV** | A `scripts/import-csv.ts` that upserts a hand-maintained CSV. |

> **Recommendation:** build the fetcher **interface** first and ship Phase 1 against the manual CSV importer + DNJournal. That unblocks the entire website while the NameBio conversation happens. Swapping in a real source later is one file, because everything downstream depends only on the normalized DTO.

**Funding.** Verified live on 2026-07-21, including a real authenticated PredictLeads call — the primary/fallback split below reflects what the real API actually does, not the original assumption.

| Priority | Source | Tier | Verified status |
| --- | --- | --- | --- |
| **1 (primary)** | **TechCrunch** — `https://techcrunch.com/category/venture/feed/` | RSS, needs extraction | Live-tested, real hit: *"Inference startup Infinity raises $15M from Touring Capital, OpenAI and Anthropic researchers"* (2026-07-20). Purpose-built "Venture Capital News" category — highest signal-to-noise of the RSS options. |
| **2 (fallback)** | **Google News RSS** — `https://news.google.com/rss/search?q="AI+startup"+funding+when:2d&hl=en-US&gl=US&ceid=US:en` | RSS, needs extraction | Live-tested, widest net — caught 4 real raises the same day (CuspAI $450M Series B, Infinity $15M, Innefu Labs $30M Series B, Banza $1M Pre-Seed). Its own feed copyright notice restricts use to *"personal, non-commercial use... within a personal feed reader"* — fine for internal discovery/dedup, check with legal before republishing verbatim. |
| **3 (fallback)** | **VentureBeat AI** — `https://venturebeat.com/category/ai/feed` (no trailing slash; `.../feed/` 308-redirects here) | RSS, needs extraction | Live-tested, AI-specific but not funding-specific — returned 0 on 2026-07-20 (no VentureBeat funding story that day, not a bug). |
| **4 (enrichment only, not discovery)** | **PredictLeads — Financing Events dataset** | Structured, but see caveats | Free tier confirmed real: **100 credits/month, $0**, 1 credit/call regardless of `limit`. Auth needs the account's signup email confirmed first (`403 forbidden` until then — distinct `X-Api-Key` / `X-Api-Token`, not the same value twice). **Two hard limits found from a real response, not assumed:** (a) `/discover/financing_events` has **no date filter** and results aren't date-sorted — a real call returned events from 2022–2025 on page 1, so there's no reliable way to ask it for "yesterday" without wasting credits paging blindly; (b) it has **no industry/category field at all** — `categories`/`financing_type` describe the *round type* (seed, series_a, private_equity), not the company's sector, so it cannot isolate "AI companies" server-side. Demoted from primary discovery source to a potential future enrichment step (cross-reference a company the RSS fetchers already found, pull its accurate `amount_normalized`/`financing_type_normalized`/investor names) — not built yet. |

Dropped from the plan: **Crunchbase** (their news RSS is just more general VC journalism, redundant with #1/#2; their real structured funding API has no free tier — paid/enterprise only).

**Pipeline:**

1. **RSS fetchers run in parallel** — TechCrunch, Google News, VentureBeat. Filter each feed for AI + funding keywords, then extract `{ company, amount, round, investors }` from the headline/summary with regex (`/\$(\d+(?:\.\d+)?)\s*(M|B|million|billion)/i`, `/(Seed|Series [A-H]|Pre-Seed)/i`). Expect ~70% accuracy — acceptable in Phase 1 because a human writes the summary anyway. Phase 2 replaces this regex pass with an LLM extraction pass over the same stored `raw` payloads.
2. **PredictLeads does not run as a discovery fetcher for a specific date** given the limits above — the code (`src/services/funding/predictleads.ts`) parses its real response shape correctly (confirmed against a live call) and stays in the fetcher list behind the credit-budget guard, but expect it to return nothing for a targeted date until it's rebuilt as a company-enrichment step.
3. **Store every mention as its own row**, even when TechCrunch and Google News both cover the same raise — raw data is never deduplicated away, only the *report* dedupes (next point), so provenance and cross-source comparison stay available. (Known gap, live-verified: the current regex `extractCompany` grabbed "Inference startup Infinity" from TechCrunch vs. "AI startup Infinity" from Google News for the same raise — different `companySlug`s, so today they wouldn't merge. Worth tightening the regex or accepting it as a Phase-1-acceptable rough edge.)
4. **Resolve duplicates at report-build time, not ingestion time.** In `src/reports/funding-report.ts`, group the day's rows by `(companySlug, round, announcementDate ±3 days)`. If a PredictLeads row exists in a group, treat it as canonical for the report's numbers (structured > regex-guessed); otherwise merge the best available fields across the RSS rows in the group.

### 3.5 Fetcher contract

`src/services/domain-sales/types.ts`:

```ts
import { z } from 'zod'

export const DomainSaleDTO = z.object({
  domain: z.string().min(3).toLowerCase(),
  price: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  saleDate: z.coerce.date(),
  marketplace: z.string().nullable(),
  source: z.string(),
  sourceUrl: z.string().url().nullable(),
  raw: z.unknown().optional(),
})
export type DomainSaleDTO = z.infer<typeof DomainSaleDTO>

export interface SalesFetcher {
  id: string
  fetch(date: Date): Promise<DomainSaleDTO[]>
}
```

Every fetcher **returns validated plain objects and nothing else** — no DB access, no logging side effects, no Next.js imports. That is what makes them unit-testable and swappable. A single `src/services/domain-sales/index.ts` runs all registered fetchers with `Promise.allSettled`, merges, and dedupes — one broken source never kills the run.

Persistence lives separately in `src/db/queries/*`, using `upsert` on the unique key.

`src/services/funding/types.ts` — same shape, plus a `tier` flag so the orchestrator knows which fetchers need the regex-extraction pass and which don't:

```ts
import { z } from 'zod'

export const FundingEventDTO = z.object({
  company: z.string().min(1),
  companySlug: z.string(),                    // slugified company name — the dedupe key
  amount: z.number().positive().nullable(),   // null when a fetcher can't determine it
  currency: z.string().length(3).default('USD'),
  round: z.string().nullable(),
  investors: z.array(z.string()).default([]),
  leadInvestor: z.string().nullable(),
  country: z.string().nullable(),
  announcementDate: z.coerce.date(),
  source: z.string(),                         // "predictleads" | "techcrunch" | "venturebeat" | "google-news"
  sourceUrl: z.string().url(),
  headline: z.string().nullable(),
  raw: z.unknown().optional(),
})
export type FundingEventDTO = z.infer<typeof FundingEventDTO>

export interface FundingFetcher {
  id: string
  tier: 'structured' | 'rss'   // 'structured' = fields already parsed (PredictLeads); 'rss' = needs extract.ts
  fetch(date: Date): Promise<FundingEventDTO[]>
}
```

`src/services/funding/extract.ts` holds the shared regex helpers (`extractAmount`, `extractRound`, `extractInvestors`) that every `tier: 'rss'` fetcher calls on the headline/summary before returning its DTOs — centralizing this means Phase 2 only has to swap what's *inside* `extract.ts` for an LLM call, not touch the fetchers.

`src/services/funding/budget.ts` wraps the `ApiUsage` row: `canSpend(provider, credits)` reads the current month's `creditsUsed` vs `creditsCap` and returns a boolean; `recordSpend(provider, credits)` upserts the increment. `src/services/funding/index.ts` calls `canSpend('predictleads', 1)` before invoking the PredictLeads fetcher and skips straight to the RSS fetchers if it returns `false` — so a busy month never throws, it just quietly degrades to RSS-only coverage for the rest of the period.

### 3.6 Pages

| Route | Rendering | Content |
| --- | --- | --- |
| `/` | static, `revalidate = 3600` | hero, latest domain-sales report card, latest funding report card, 6 recent articles, "today's top sale" stat tile |
| `/insights` | static, `revalidate = 3600` | article grid, type filter (`?type=domain-sales\|funding`) via `searchParams`, pagination |
| `/insights/[slug]` | `generateStaticParams` + `dynamicParams = true` | article header, markdown body, then the raw table: `SalesTable` or `FundingTable` depending on `article.type` |

Remember `await props.params` and `await props.searchParams`. Add `generateMetadata` (async params too) and a `opengraph-image.tsx` later.

Markdown rendering: `react-markdown` + `remark-gfm`, or `marked` + `isomorphic-dompurify` if you want plain HTML. Render server-side only.

### 3.7 API routes

All read-only in Phase 1: `GET /api/articles`, `GET /api/articles/[slug]`, `GET /api/domain-sales?from=&to=&min=&limit=`, `GET /api/funding?…`. Use `RouteContext<'/api/articles/[slug]'>` for typed async params. Validate query params with zod. Cap `limit` at 100.

### 3.8 Report building (still no AI)

`src/reports/domain-sales-report.ts` takes the day's rows and returns `{ title, slug, summary, markdown, metrics }` computed deterministically: total volume, average price, median, count, top 10 table, highest sale. You then edit the `summary` by hand in a draft before flipping `status` to `PUBLISHED`. That hand-written summary is the ground truth you'll benchmark the Phase 2 LLM output against — keep the first ~20 of them.

`scripts/build-report.ts --type=domain-sales --date=2026-07-20` writes the draft article row.

### Phase 1 definition of done

- [ ] `prisma migrate` applied against Supabase; tables visible in the dashboard
- [ ] `tsx scripts/ingest.ts --source=funding` writes rows; running it twice adds **zero** duplicates
- [ ] At least one real domain-sales source or the CSV importer works end to end
- [ ] `/`, `/insights`, `/insights/[slug]` render real DB data
- [ ] Two published articles, one of each type
- [ ] Four API routes return JSON
- [ ] `npm run build` is clean

---

## 4. Phase 2 — LLM-generated reports

**Built, provider swapped.** Keep the deterministic builder — it produces the *facts block* (metrics + top-10 table) and stays completely unchanged. The LLM only writes the "Market Summary" prose (previously a hand-fill placeholder) around it.

- `src/ai/client.ts` — **NVIDIA NIM** (OpenAI-compatible, plain `fetch`, no SDK), not Anthropic — same provider and free `NVIDIA_API_KEY` as the main name.ai app's `free_tools/server/llm.js`, model `meta/llama-3.1-8b-instruct` by default (`TOOLS_LLM_MODEL` to override).
- `src/ai/market-summary.ts` — one prompt builder parameterized by report type, not separate `domain-sales.ts`/`funding.ts` files (the two facts shapes are close enough that splitting them would just be duplicated prompt scaffolding). Every dollar figure in the facts is pre-formatted (`"$72,000"`, not `72000`) and the model is instructed to copy figures verbatim rather than recompute them — without this the model prints raw unformatted numbers (`28633.333333333332`) instead of natural prose; confirmed both by testing and by fixing it.
- `promptVersion` and `model` are stored on the article, but inside `metrics.ai` (`{ model, promptVersion, generatedAt }`) rather than as dedicated Payload fields — avoids a schema migration for two rarely-queried strings; `metrics` is already the loose bag this project stores derived data in.
- Re-extracting `company`/`amount`/`round`/`investors` from `funding_events.raw` via a second LLM pass (replacing the regex extractor) — **not built**, still open.
- Generated articles land as `DRAFT`, unchanged. A human still flips them to `PUBLISHED`.
- Guardrail: implemented as designed — extracts every `$` figure from the generated text and rejects the completion unless each one is within 3% (or $25, whichever is larger) of a real number in the facts block (aggregate stats and every individual top-10 entry, not just the top one). One retry at lower temperature on rejection, then falls back to the deterministic placeholder. Verified against 5 cases including an outright invented figure and an inflated total — both correctly rejected; a rounded real figure ("$85.9k" for $85,900) correctly accepted.
- Any failure — no key, rate limit, guardrail rejection, or an unexpected error from the AI subsystem entirely — leaves the deterministic placeholder in place and never blocks the draft from saving. Tested explicitly: a zero-activity date skips the AI call outright (nothing to summarize) and metrics.ai is absent, confirming the skip path.

## 5. Phase 3 — Automation

**Built, but not as originally planned above.** Rather than HTTP cron routes triggered by an external scheduler, `src/instrumentation.ts` starts an in-process daily timer (`src/lib/daily-schedule.ts`) when the Next.js server boots — no cron library, no external scheduler dependency, no `CRON_SECRET`/`vercel.json`/GitHub Actions. Runs once daily at **08:00 IST**, computed against IST's fixed UTC+5:30 offset (no DST to account for) and self-rescheduled via `setTimeout` after each run.

This only works because the app is self-hosted as a long-running container (Coolify), not serverless — a persistent process is exactly what an in-process timer needs, and exactly what the original Vercel-Cron-shaped design was written for a different hosting assumption. Only starts when `NODE_ENV=production` (the deployed container), so `next dev` never fires it.

Each run: ingest domain-sales → ingest funding → build domain-sales draft → build funding draft, each step independently try/caught so one source's outage doesn't block the others. Logged to `ingest_runs`, same as manual runs via `scripts/ingest.ts`.

**Publish stayed manual, deliberately** — the run only creates/updates DRAFT articles in Payload (same `buildAndSaveReport` used by `scripts/build-report.ts`), same as the Phase 2 rule ("Generated articles land as DRAFT. A human still flips them to PUBLISHED."). The single-daily-run design collapses the originally separate ingest/generate/publish stages into one step, but auto-publish was never part of that rule and still isn't — a human reviews and publishes from the Payload admin.

`cacheComponents: true` / `use cache` / `revalidateTag('articles')` is moot now — article reads already go through Payload's own API (see the CMS integration commit), not a local `use cache`-wrapped query layer, so there's no local cache to invalidate from a publish route that no longer exists.

## 6. Phase 4 — CMS (Payload)

Payload 3 mounts inside the same Next app and can share the Postgres database. Editors get drafts, preview, scheduled publish, and media. Do this **only after** the pipeline is stable — introducing a CMS mid-pipeline means two systems disagreeing about who owns `articles`.

## 7. Phase 5 — LinkedIn distribution

LinkedIn Marketing API (`w_organization_social`), requires app review. Generate a short post from the article summary + an OG image; keep `linkedInPostId` on the article for idempotency. Start with a manual approval queue, not full auto-post.

---

## 8. Build order (do it in this sequence)

1. `src/` move + Prisma/Supabase wiring + schema + migration
2. Prisma client + query helpers + seed data
3. Pages against seeded data — get the site *visible* early
4. PredictLeads signup + one live test call to confirm Financing Events' credit cost and response shape (blocks step 5)
5. Funding fetchers — PredictLeads first, then TechCrunch/VentureBeat/Google News RSS + `extract.ts`, proves the pipeline
6. Domain-sales fetcher — resolve the `namebio.vps4.auctionhacker.com` ownership/gap question, or fall back to CSV importer
7. `scripts/ingest.ts` + idempotency verification (run twice, assert zero duplicate rows)
8. Deterministic report builder + first two hand-finished articles
9. API routes
10. Ship Phase 1 → then Phase 2

## 9. Open questions

1. **Supabase project** — new project for the blog, or reuse the existing Name.ai Hetzner/Stage instance in a separate schema?
2. **PredictLeads account** — who creates the free-tier signup (needs a Namekart email/login)? Needed before step 4 of the build order.
3. **`namebio.vps4.auctionhacker.com` ownership** — who built/owns this service, and can whoever it is restart whatever job stalled on 2026-07-01? Confirmed live and free (paid NameBio credits already provisioned) but currently 21 days stale as of 2026-07-21.
4. **Hosting** — Vercel (cron included) or self-hosted alongside Name.ai?
5. **Scope of "sales"** — `.ai` only, or all TLDs with `.ai` featured? The schema supports both via `tld`; the report builder needs to know.
6. **Editorial ownership** — who writes the Phase 1 summaries and who approves Phase 2 drafts?
