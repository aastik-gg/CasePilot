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
- **P2 — Benchmark + Risk ✅** Configurable market-standard baseline (static defaults + per-org
  overrides via admin API); `BenchmarkStage` labels each clause favourable/standard/unusual/unfavourable
  with cited rationale; `ScoreStage` assigns risk score/severity/categories; **overall score computed
  deterministically in code** (`RiskAggregator`, not the LLM). UI: risk gauge, category breakdown,
  risk-ranked clause cards with deviation chips. Pipeline: ingest → extract → benchmark → score → summarise.
- **P3 — Compare + Polish ✅** Side-by-side clause comparison across contracts (`CompareClausesUseCase`,
  `/compare` UI with favourability ranking + material differences); Markdown summary export; empty/error
  states and the Compare nav. v1 aligns clauses by type (embedding alignment via pgvector is a noted refinement).

- **Bonus ✅** OCR for scanned PDFs (Claude vision fallback when a PDF has no text layer);
  redline suggestions (`SuggestStage` proposes standard-aligned language for flagged clauses);
  market-standards admin UI (`/settings/standards`); embedding-based clause alignment for compare
  (pgvector + OpenAI embeddings, **optional** — set `OPENAI_API_KEY`, else compare aligns by type).
- **Eval ✅** Vitest harness: pure `RiskAggregator` unit tests + a golden-corpus scorecard that runs
  the real stages + model and scores M1–M5 (`pnpm test` / `pnpm test:eval`; live eval needs `ANTHROPIC_API_KEY`).

All four phases (P0–P3) plus all bonus features are in. Success metrics M1–M5 (`../docs/PRD.md` §2.4)
are exercised end to end and validated by the eval harness. Pipeline:
ingest → extract → benchmark → score → suggest → summarise.
