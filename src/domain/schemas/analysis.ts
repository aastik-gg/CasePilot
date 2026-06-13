import { z } from "zod";

/** A commercial term worth surfacing (value, term, renewal, payment, …). */
export const KeyTerm = z.object({
  label: z.string(),
  value: z.string(),
});

/** One of the top issues to negotiate, linked to the clause refs it derives from. */
export const TopIssue = z.object({
  title: z.string(),
  detail: z.string(),
  clauseRefs: z.array(z.string()), // "c3" — mapped to clause IDs by the stage
});

/** The plain-English executive summary (PRD F5). LLM output shape. */
export const SummarySchema = z.object({
  overview: z.string(), // what the contract covers, in plain English
  whoCarriesRisk: z.string(),
  keyTerms: z.array(KeyTerm),
  topIssues: z.array(TopIssue), // aim for 3
});
export type Summary = z.infer<typeof SummarySchema>;

/** Persisted analysis: the summary with clause refs resolved to clause IDs + provenance. */
export const PersistedTopIssue = TopIssue.extend({ clauseIds: z.array(z.string()) });
export const AnalysisSchema = z.object({
  contractId: z.string(),
  overview: z.string(),
  whoCarriesRisk: z.string(),
  keyTerms: z.array(KeyTerm),
  topIssues: z.array(PersistedTopIssue),
  modelVersions: z.record(z.string(), z.string()),
  createdAt: z.date(),
});
export type Analysis = z.infer<typeof AnalysisSchema>;
