import { AppError, err, ok, type Result } from "@/domain/result";
import type { Stage, StageContext, StageOutput } from "@/domain/ports/Stage";
import type { LlmPort } from "@/domain/ports/llm";
import type { AssessmentRepo, ClauseRepo, MarketStandardRepo } from "@/domain/ports/repositories";
import { SuggestSchema } from "@/domain/schemas/assessment";
import { PROMPT_VERSIONS, SUGGEST_SYSTEM, buildSuggestPrompt } from "@/application/pipeline/prompts";

/**
 * Bonus stage — Redline Suggestions. For clauses flagged unfavourable/unusual, propose
 * standard-aligned replacement language. No-op (and free) when nothing is flagged. Idempotent.
 */
export class SuggestStage implements Stage {
  readonly name = "suggest" as const;

  constructor(
    private readonly llm: LlmPort,
    private readonly clauses: ClauseRepo,
    private readonly assessments: AssessmentRepo,
    private readonly standards: MarketStandardRepo,
  ) {}

  async run(ctx: StageContext): Promise<Result<StageOutput>> {
    const { contract } = ctx;
    try {
      const [clauses, assessments] = await Promise.all([
        this.clauses.listByContract(contract.id),
        this.assessments.listByContract(contract.id),
      ]);
      const standards = await this.standards.forContract(contract.orgId, contract.partyPerspective);

      const built = buildSuggestPrompt(contract, clauses, assessments, standards);
      if (!built) return ok({ produced: 0 }); // nothing flagged — skip the call

      const { object } = await this.llm.generate({
        task: "suggest",
        schema: SuggestSchema,
        system: SUGGEST_SYSTEM,
        prompt: built.prompt,
        context: { contractId: contract.id, stage: "suggest", promptVersion: PROMPT_VERSIONS.suggest },
      });

      const items = object.suggestions
        .map((s) => {
          const clauseId = built.refToClauseId.get(s.clauseRef);
          return clauseId ? { clauseId, suggestedRedline: s.suggestedLanguage } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      await this.assessments.setSuggestions(items);
      return ok({ produced: items.length });
    } catch (cause) {
      return err(new AppError("pipeline_failed", `suggest failed for ${contract.id}`, cause));
    }
  }
}
