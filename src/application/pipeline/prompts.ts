import { CLAUSE_LABELS } from "@/domain/schemas/clause";
import type { Clause } from "@/domain/schemas/clause";
import type { Contract } from "@/domain/schemas/contract";
import type { DocumentNode } from "@/domain/schemas/document";
import type { ClauseAssessment } from "@/domain/schemas/assessment";
import type { MarketStandard } from "@/domain/schemas/marketStandard";

/** Versioned so every llm_calls row is reproducible (TECH_SPEC §10). Bump when a prompt changes. */
export const PROMPT_VERSIONS = {
  extract: "extract-v1",
  benchmark: "benchmark-v1",
  score: "score-v1",
  suggest: "suggest-v1",
  summarise: "summarise-v2",
} as const;

const truncate = (s: string, n = 600) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Shared clause-ref scheme ("c#") so every stage and the UI agree on how clauses are referenced. */
function clauseRefs(clauses: Clause[]) {
  const refToClauseId = new Map<string, string>();
  const refByClauseId = new Map<string, string>();
  clauses.forEach((c, i) => {
    const ref = `c${i}`;
    refToClauseId.set(ref, c.id);
    refByClauseId.set(c.id, ref);
  });
  return { refToClauseId, refByClauseId };
}

// ── Extraction ──────────────────────────────────────────────────────────────
const CLAUSE_LIST = (Object.keys(CLAUSE_LABELS) as (keyof typeof CLAUSE_LABELS)[])
  .filter((k) => k !== "other")
  .map((k) => `- ${k} (${CLAUSE_LABELS[k]})`)
  .join("\n");

export const EXTRACT_SYSTEM = `You are a contract analyst. Extract the named clause types from the contract below.
Clause types to find:
${CLAUSE_LIST}
Use "other" only for a materially important clause that fits none of the above.

Rules:
- Copy verbatimText EXACTLY from the contract — do not paraphrase or summarize.
- For nodeRefs, list the [n#] reference(s) that contain the clause.
- A clause type may appear once; if genuinely split across sections, return one entry covering all its [n#] refs.
- confidence is 0..1. Only return clauses actually present in the text.`;

export function buildExtractPrompt(nodes: DocumentNode[]): {
  prompt: string;
  refToNodeId: Map<string, string>;
} {
  const refToNodeId = new Map<string, string>();
  const lines = nodes.map((n, i) => {
    const ref = `n${i}`;
    refToNodeId.set(ref, n.id);
    const head = [n.numberLabel, n.heading].filter(Boolean).join(" ");
    return `[${ref}] ${head}\n${n.text}`;
  });
  return { prompt: lines.join("\n\n"), refToNodeId };
}

// ── Benchmark (deviation vs market standard) ──────────────────────────────────
export const BENCHMARK_SYSTEM = `You compare contract clauses against a market-standard baseline (PRD F3).
For each clause, judge how it deviates FROM THE BASELINE, from the stated perspective's point of view:
- favourable: better for us than standard
- standard: in line with the baseline
- unusual: atypical but not clearly good or bad
- unfavourable: worse for us than standard
Give a one- to two-sentence rationale citing the specific language or term that differs. Be concrete.`;

export function buildBenchmarkPrompt(
  contract: Contract,
  clauses: Clause[],
  standards: MarketStandard[],
): { prompt: string; refToClauseId: Map<string, string> } {
  const { refToClauseId } = clauseRefs(clauses);
  const stdByType = new Map(standards.map((s) => [s.clauseType, s] as const));
  const refByClauseId = new Map([...refToClauseId].map(([ref, id]) => [id, ref] as const));

  const blocks = clauses.map((c) => {
    const ref = refByClauseId.get(c.id)!;
    const std = stdByType.get(c.clauseType);
    const baseline = std
      ? `Baseline (${std.title}): ${std.standardPosition}${std.acceptableRange ? ` Acceptable range: ${std.acceptableRange}.` : ""}`
      : "Baseline: (no specific standard — judge against general market norms).";
    return `[${ref}] ${CLAUSE_LABELS[c.clauseType]}\nClause text: ${truncate(c.verbatimText)}\n${baseline}`;
  });

  const header = `Contract: "${contract.title}". Perspective: ${contract.partyPerspective} (judge favourability from this side).`;
  return { prompt: `${header}\n\n${blocks.join("\n\n")}`, refToClauseId };
}

// ── Score (risk per clause) ───────────────────────────────────────────────────
export const SCORE_SYSTEM = `You assign risk to contract clauses that have already been benchmarked (PRD F4).
For each clause return:
- riskScore: 0–100 (0 = no risk, 100 = severe). Anchor to the deviation: unfavourable/unusual clauses score higher; favourable/standard score lower.
- severity: low (0–24), medium (25–49), high (50–74), critical (75–100) — consistent with riskScore.
- riskCategories: any of financial, operational, legal, reputational that apply (multi-label).
Be calibrated: reserve high/critical for clauses that could cause real financial or legal harm.`;

export function buildScorePrompt(
  contract: Contract,
  clauses: Clause[],
  assessments: ClauseAssessment[],
): { prompt: string; refToClauseId: Map<string, string> } {
  const { refToClauseId } = clauseRefs(clauses);
  const refByClauseId = new Map([...refToClauseId].map(([ref, id]) => [id, ref] as const));
  const byClause = new Map(assessments.map((a) => [a.clauseId, a] as const));

  const blocks = clauses.map((c) => {
    const ref = refByClauseId.get(c.id)!;
    const a = byClause.get(c.id);
    const dev = a ? `Deviation: ${a.deviation}. ${a.rationale}` : "Deviation: (not benchmarked).";
    return `[${ref}] ${CLAUSE_LABELS[c.clauseType]}\nClause text: ${truncate(c.verbatimText, 400)}\n${dev}`;
  });

  const header = `Contract: "${contract.title}". Perspective: ${contract.partyPerspective}.`;
  return { prompt: `${header}\n\n${blocks.join("\n\n")}`, refToClauseId };
}

// ── Suggest (redline language for flagged clauses) ────────────────────────────
export const SUGGEST_SYSTEM = `You propose redline replacement language for contract clauses that are unfavourable or unusual (PRD bonus).
For each clause given, write concise, professional replacement language that moves the clause toward the
market-standard baseline from the customer's perspective. Keep it drafting-ready and specific; do not
explain — output only the proposed clause language.`;

/** Builds the suggest prompt for the already-flagged clauses. Returns null if nothing needs a redline. */
export function buildSuggestPrompt(
  contract: Contract,
  clauses: Clause[],
  assessments: ClauseAssessment[],
  standards: MarketStandard[],
): { prompt: string; refToClauseId: Map<string, string> } | null {
  const stdByType = new Map(standards.map((s) => [s.clauseType, s] as const));
  const byClause = new Map(assessments.map((a) => [a.clauseId, a] as const));
  const flagged = clauses.filter((c) => {
    const a = byClause.get(c.id);
    return a && (a.deviation === "unfavourable" || a.deviation === "unusual");
  });
  if (flagged.length === 0) return null;

  const refToClauseId = new Map<string, string>();
  const blocks = flagged.map((c, i) => {
    const ref = `c${i}`;
    refToClauseId.set(ref, c.id);
    const std = stdByType.get(c.clauseType);
    const baseline = std ? `Target standard: ${std.standardPosition}` : "Target: general market norm.";
    return `[${ref}] ${CLAUSE_LABELS[c.clauseType]}\nCurrent: ${truncate(c.verbatimText)}\n${baseline}`;
  });
  const header = `Contract: "${contract.title}". Perspective: ${contract.partyPerspective}.`;
  return { prompt: `${header}\n\n${blocks.join("\n\n")}`, refToClauseId };
}

// ── Summary ───────────────────────────────────────────────────────────────────
export const SUMMARY_SYSTEM = `You write a one-page executive summary of a contract for a NON-LAWYER (PRD F5).
No undefined jargon; expand defined terms. Be accurate and concise.
Produce:
- overview: what the contract covers, plain English.
- whoCarriesRisk: which party bears the most risk and why, grounded in the flagged clauses below.
- keyTerms: the key commercial terms (e.g. contract value, term length, renewal, payment schedule) as label/value pairs.
- topIssues: exactly THREE issues to negotiate, prioritising the highest-risk / most unfavourable clauses, each with a short title, a plain-English detail, and the clause refs (c#) it derives from.`;

export function buildSummaryPrompt(
  contract: Contract,
  clauses: Clause[],
  assessments: ClauseAssessment[],
): { prompt: string; refToClauseId: Map<string, string> } {
  const { refToClauseId } = clauseRefs(clauses);
  const refByClauseId = new Map([...refToClauseId].map(([ref, id]) => [id, ref] as const));
  const byClause = new Map(assessments.map((a) => [a.clauseId, a] as const));

  const lines = clauses.map((c) => {
    const ref = refByClauseId.get(c.id)!;
    const a = byClause.get(c.id);
    const risk = a
      ? ` [${a.deviation}${a.severity ? `, ${a.severity} risk ${a.riskScore ?? ""}` : ""}]`
      : "";
    return `[${ref}] ${CLAUSE_LABELS[c.clauseType]}${risk}: ${truncate(c.verbatimText)}`;
  });

  const header = `Contract: "${contract.title}". Perspective: ${contract.partyPerspective} (judge favourability from this side).`;
  const body = lines.length ? lines.join("\n\n") : "(No named clauses were extracted.)";
  return { prompt: `${header}\n\nExtracted clauses (with benchmark + risk):\n${body}`, refToClauseId };
}
