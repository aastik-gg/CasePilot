import { AppError, err, ok, type Result } from "@/domain/result";
import type { LlmPort } from "@/domain/ports/llm";
import type { EmbeddingPort } from "@/domain/ports/embedding";
import type {
  AssessmentRepo,
  ClauseEmbeddingRepo,
  ClauseRepo,
  ContractRepo,
} from "@/domain/ports/repositories";
import { CLAUSE_LABELS, type ClauseType } from "@/domain/schemas/clause";
import { CompareSchema, type CompareEntry, type CompareResult } from "@/domain/schemas/compare";

const COMPARE_PROMPT_VERSION = "compare-v1";

const COMPARE_SYSTEM = `You compare the SAME clause type across several contracts for due diligence (PRD F6).
Identify the material differences (e.g. liability cap $1M vs unlimited, 30-day vs 90-day notice).
For each contract (referenced as k#) give a short verdict and a favourability rating from the
customer's perspective. Then rank the contracts from most to least favourable (best first).`;

/**
 * Side-by-side clause comparison across contracts. On-demand use-case (not a pipeline stage).
 * v1 aligns "the same clause" by clause type; cross-contract embedding alignment (pgvector) is a
 * documented P3+ refinement (Anthropic has no embeddings API; would need a separate provider).
 */
export class CompareClausesUseCase {
  constructor(
    private readonly contracts: ContractRepo,
    private readonly clauses: ClauseRepo,
    private readonly assessments: AssessmentRepo,
    private readonly llm: LlmPort,
    private readonly embeddings?: EmbeddingPort,
    private readonly clauseEmbeddings?: ClauseEmbeddingRepo,
  ) {}

  async execute(
    orgId: string,
    clauseType: ClauseType,
    contractIds: string[],
  ): Promise<Result<CompareResult>> {
    try {
      const entries: CompareEntry[] = [];
      for (const id of contractIds) {
        const contract = await this.contracts.findById(orgId, id);
        if (!contract) continue; // silently drop out-of-org / missing ids

        const clauseList = await this.clauses.listByContract(id);
        const clause = clauseList
          .filter((c) => c.clauseType === clauseType)
          .sort((a, b) => b.confidence - a.confidence)[0];
        const assessment = clause
          ? (await this.assessments.listByContract(id)).find((a) => a.clauseId === clause.id)
          : undefined;

        entries.push({
          contractId: id,
          title: contract.title,
          clauseText: clause?.verbatimText ?? null,
          deviation: assessment?.deviation ?? null,
          severity: assessment?.severity ?? null,
          riskScore: assessment?.riskScore ?? null,
          verdict: null,
          favourability: null,
        });
      }

      if (entries.length < 2) {
        return err(new AppError("validation", "need at least two accessible contracts to compare"));
      }

      // Embedding alignment (bonus): fill in contracts that lack an exact type match by finding the
      // clause nearest to a reference clause from a contract that has it. No-op without a provider.
      await this.alignByEmbedding(entries);

      const withText = entries.filter((e) => e.clauseText);
      if (withText.length < 1) {
        return ok({ clauseType, entries, differences: [], ranking: entries.map((e) => e.contractId) });
      }

      // Build the prompt with contract refs k#.
      const refToId = new Map<string, string>();
      const blocks = entries.map((e, i) => {
        const ref = `k${i}`;
        refToId.set(ref, e.contractId);
        const risk = e.deviation ? ` [${e.deviation}${e.severity ? `, ${e.severity}` : ""}]` : "";
        return `[${ref}] ${e.title}${risk}\n${e.clauseText ?? "(no such clause found)"}`;
      });

      const { object } = await this.llm.generate({
        task: "compare",
        schema: CompareSchema,
        system: COMPARE_SYSTEM,
        prompt: `Clause type: ${CLAUSE_LABELS[clauseType]}.\n\n${blocks.join("\n\n")}`,
        context: { contractId: entries[0].contractId, stage: "compare", promptVersion: COMPARE_PROMPT_VERSION },
      });

      const verdictByRef = new Map(object.verdicts.map((v) => [v.contractRef, v] as const));
      const enriched = entries.map((e) => {
        const ref = [...refToId].find(([, id]) => id === e.contractId)?.[0];
        const v = ref ? verdictByRef.get(ref) : undefined;
        return { ...e, verdict: v?.verdict ?? null, favourability: v?.favourability ?? null };
      });
      const ranking = object.ranking
        .map((ref) => refToId.get(ref))
        .filter((id): id is string => Boolean(id));

      return ok({
        clauseType,
        entries: enriched,
        differences: object.differences,
        ranking: ranking.length ? ranking : entries.map((e) => e.contractId),
      });
    } catch (cause) {
      return err(new AppError("internal", "compare failed", cause));
    }
  }

  /** Fill missing clause columns using nearest-by-embedding to a reference clause (bonus). */
  private async alignByEmbedding(entries: { contractId: string; clauseText: string | null }[]): Promise<void> {
    if (!this.embeddings?.enabled() || !this.clauseEmbeddings) return;
    const reference = entries.find((e) => e.clauseText)?.clauseText;
    const missing = entries.filter((e) => !e.clauseText);
    if (!reference || missing.length === 0) return;

    const [queryVector] = await this.embeddings.embed([reference]);
    if (!queryVector) return;

    for (const entry of missing) {
      const nearId = await this.clauseEmbeddings.nearestInContract(entry.contractId, queryVector);
      if (!nearId) continue;
      const list = await this.clauses.listByContract(entry.contractId);
      const found = list.find((c) => c.id === nearId);
      if (found) entry.clauseText = found.verbatimText;
    }
  }
}
