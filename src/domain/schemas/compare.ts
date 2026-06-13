import { z } from "zod";
import { ClauseType } from "@/domain/schemas/clause";
import { Deviation, Severity } from "@/domain/schemas/assessment";

/** Favourability verdict for one contract's version of a clause (PRD F6.3). */
export const Favourability = z.enum([
  "most_favourable",
  "favourable",
  "neutral",
  "unfavourable",
  "least_favourable",
]);
export type Favourability = z.infer<typeof Favourability>;

/** Request: compare one clause type across 2+ contracts (PRD F6.1). */
export const CompareInput = z.object({
  clauseType: ClauseType,
  contractIds: z.array(z.string()).min(2).max(6),
});
export type CompareInput = z.infer<typeof CompareInput>;

/** LLM output — uses contract refs ("k0") mapped back to contract IDs by the use-case. */
export const CompareSchema = z.object({
  differences: z.array(z.object({ aspect: z.string(), detail: z.string() })),
  verdicts: z.array(
    z.object({
      contractRef: z.string(),
      verdict: z.string(),
      favourability: Favourability,
    }),
  ),
  ranking: z.array(z.string()), // contract refs, most → least favourable
});

/** One contract's column in the comparison. */
export const CompareEntry = z.object({
  contractId: z.string(),
  title: z.string(),
  clauseText: z.string().nullable(),
  deviation: Deviation.nullable(),
  severity: Severity.nullable(),
  riskScore: z.number().nullable(),
  verdict: z.string().nullable(),
  favourability: Favourability.nullable(),
});
export type CompareEntry = z.infer<typeof CompareEntry>;

/** Full result returned to the UI (PRD F6). */
export const CompareResult = z.object({
  clauseType: ClauseType,
  entries: z.array(CompareEntry),
  differences: z.array(z.object({ aspect: z.string(), detail: z.string() })),
  ranking: z.array(z.string()), // contract IDs, most → least favourable
});
export type CompareResult = z.infer<typeof CompareResult>;
