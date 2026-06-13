import { z } from "zod";

/** The seven named clause types CasePilot extracts (PRD F2.1), plus a catch-all. */
export const ClauseType = z.enum([
  "indemnity",
  "liability_limit",
  "governing_law",
  "termination",
  "ip_ownership",
  "payment_terms",
  "confidentiality",
  "other",
]);
export type ClauseType = z.infer<typeof ClauseType>;

/** Human label for each clause type. */
export const CLAUSE_LABELS: Record<ClauseType, string> = {
  indemnity: "Indemnity",
  liability_limit: "Limitation of Liability",
  governing_law: "Governing Law",
  termination: "Termination",
  ip_ownership: "IP Ownership",
  payment_terms: "Payment Terms",
  confidentiality: "Confidentiality",
  other: "Other / Review",
};

/** A persisted clause, anchored to the document nodes it came from (PRD F2.2). */
export const ClauseSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  clauseType: ClauseType,
  nodeIds: z.array(z.string()),
  verbatimText: z.string(),
  confidence: z.number().min(0).max(1),
  pageAnchor: z.number().int().nullable(),
  createdAt: z.date(),
});
export type Clause = z.infer<typeof ClauseSchema>;

/**
 * LLM extraction output. `nodeRefs` are the short refs ("n12") shown to the model in the prompt;
 * the stage maps them back to real node IDs. No numeric constraints here — Anthropic structured
 * outputs don't support them; ranges are validated in code after parsing.
 */
export const ExtractedClause = z.object({
  clauseType: ClauseType,
  nodeRefs: z.array(z.string()),
  verbatimText: z.string(),
  confidence: z.number(),
});
export const ClauseExtractionSchema = z.object({
  clauses: z.array(ExtractedClause),
});
export type ClauseExtraction = z.infer<typeof ClauseExtractionSchema>;
