import { CLAUSE_LABELS } from "@/domain/schemas/clause";
import type { Clause } from "@/domain/schemas/clause";
import type { Contract } from "@/domain/schemas/contract";
import type { DocumentNode } from "@/domain/schemas/document";

/** Versioned so every llm_calls row is reproducible (TECH_SPEC §10). Bump when a prompt changes. */
export const PROMPT_VERSIONS = { extract: "extract-v1", summarise: "summarise-v1" } as const;

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

/** Builds the extraction prompt and the ref→nodeId map used to resolve the model's nodeRefs. */
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

export const SUMMARY_SYSTEM = `You write a one-page executive summary of a contract for a NON-LAWYER (PRD F5).
No undefined jargon; expand defined terms. Be accurate and concise.
Produce:
- overview: what the contract covers, plain English.
- whoCarriesRisk: which party bears the most risk and why.
- keyTerms: the key commercial terms (e.g. contract value, term length, renewal, payment schedule) as label/value pairs.
- topIssues: exactly THREE issues to negotiate, each with a short title, a plain-English detail, and the clause refs (c#) it derives from.`;

/** Builds the summary prompt and the ref→clauseId map used to resolve topIssue clause refs. */
export function buildSummaryPrompt(
  contract: Contract,
  clauses: Clause[],
): { prompt: string; refToClauseId: Map<string, string> } {
  const refToClauseId = new Map<string, string>();
  const lines = clauses.map((c, i) => {
    const ref = `c${i}`;
    refToClauseId.set(ref, c.id);
    const text = c.verbatimText.length > 600 ? `${c.verbatimText.slice(0, 600)}…` : c.verbatimText;
    return `[${ref}] ${CLAUSE_LABELS[c.clauseType]}: ${text}`;
  });
  const header = `Contract: "${contract.title}". Perspective: ${contract.partyPerspective} (judge favourability from this side).`;
  const body = lines.length ? lines.join("\n\n") : "(No named clauses were extracted.)";
  return { prompt: `${header}\n\nExtracted clauses:\n${body}`, refToClauseId };
}
