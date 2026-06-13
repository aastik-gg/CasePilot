# CasePilot

⚖️ **Legal Document Intelligence System** — find the risk in 100-page contracts before your lawyer does.

Planning docs live in `../docs/` (`PRD.md`, `TECH_SPEC.md`, `PROJECT_PLAN.md`, `FRONTEND_DESIGN.md`).

## Stack
Next.js 16 (App Router) · Vercel AI SDK (from P1) · Postgres + pgvector (Drizzle) · Upstash Redis + QStash · Cloudflare R2 · Clerk · deployed on Vercel.

## Architecture (hexagonal / ports & adapters)
```
src/
├── domain/         pure business types (Zod schemas = single source of truth), ports, scoring
├── application/    use-cases + the staged analysis pipeline (PipelineRunner over Stage[])
├── infrastructure/ adapters — the ONLY place vendor SDKs appear (db, storage, queue, parsing, llm)
├── composition/    container.ts — wires adapters → ports (dependency injection)
└── app/            Next.js routes/components (thin; call use-cases via the container)
```
The hexagonal boundary is enforced by ESLint: `domain`/`application` may not import `infrastructure` or any vendor SDK (`pnpm lint`).

## Local setup
```bash
cp .env.example .env.local   # fill in Clerk, Neon, R2; leave QSTASH_TOKEN empty for dev
pnpm db:push                 # create tables (needs DATABASE_URL)
pnpm dev
```
With `QSTASH_TOKEN` unset, the analysis pipeline runs **inline in-process** (no queue infra needed) and
state is held in memory — ideal for local dev. In production, set QStash + Upstash Redis and the same
code dispatches stages durably over HTTP.

## Scripts
`pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm db:generate|push|migrate`

## Phase status
- **P0 — Foundation ✅** Auth (Clerk), presigned R2 upload, ingestion pipeline (PDF/DOCX → structured
  tree preserving numbering + cross-references), live SSE status, document-tree UI. Resumable staged
  pipeline + composition root in place.
- **P1 — Extraction + Summary ✅** Clause extraction (7 named types) via Opus 4.8 + structured outputs,
  grounded to source text; plain-English executive summary (overview, who-carries-risk, key terms,
  top-3 issues). Vercel AI SDK behind `LlmPort`; `ModelRouter` factory; every call audited in `llm_calls`.
  Pipeline now: ingest → extract → summarise.
- **P2 — Benchmark + Risk** (next) market-standard baseline, deviation labels, risk scoring.
- **P3 — Compare + Polish** — see `../docs/PROJECT_PLAN.md`.
