import { z } from "zod";
import { RiskCategory } from "@/domain/schemas/risk";

/** How an extracted clause compares to the market-standard baseline (PRD F3.2). */
export const Deviation = z.enum(["favourable", "standard", "unusual", "unfavourable"]);
export type Deviation = z.infer<typeof Deviation>;

/** Risk severity band (PRD F4.1). */
export const Severity = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof Severity>;

/** A persisted assessment of one clause: benchmark deviation + (after scoring) risk. */
export const ClauseAssessmentSchema = z.object({
  clauseId: z.string(),
  contractId: z.string(),
  marketStandardId: z.string().nullable(),
  deviation: Deviation,
  rationale: z.string(),
  riskScore: z.number().int().min(0).max(100).nullable(), // null until the score stage runs
  severity: Severity.nullable(),
  riskCategories: z.array(RiskCategory),
  suggestedRedline: z.string().nullable(), // standard-aligned replacement language (bonus)
});
export type ClauseAssessment = z.infer<typeof ClauseAssessmentSchema>;

/** Benchmark stage LLM output — deviation + rationale per clause ref ("c#"). */
export const BenchmarkSchema = z.object({
  assessments: z.array(
    z.object({
      clauseRef: z.string(),
      deviation: Deviation,
      rationale: z.string(),
    }),
  ),
});

/** Score stage LLM output — risk per clause ref. No numeric constraints (Anthropic structured outputs). */
export const ScoreSchema = z.object({
  scores: z.array(
    z.object({
      clauseRef: z.string(),
      riskScore: z.number(),
      severity: Severity,
      riskCategories: z.array(RiskCategory),
    }),
  ),
});

/** Suggest stage LLM output — proposed standard-aligned replacement language per flagged clause. */
export const SuggestSchema = z.object({
  suggestions: z.array(
    z.object({
      clauseRef: z.string(),
      suggestedLanguage: z.string(),
    }),
  ),
});
