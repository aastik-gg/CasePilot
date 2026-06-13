import { AppError, err, ok, type Result } from "@/domain/result";
import type { Stage, StageContext, StageOutput } from "@/domain/ports/Stage";
import type { LlmPort } from "@/domain/ports/llm";
import type { AnalysisRepo, ClauseRepo } from "@/domain/ports/repositories";
import { SummarySchema } from "@/domain/schemas/analysis";
import { PROMPT_VERSIONS, SUMMARY_SYSTEM, buildSummaryPrompt } from "@/application/pipeline/prompts";

/**
 * Stage (final) — Plain-English Summary (TECH_SPEC §4, PRD F5). Built from the structured analysis
 * (extracted clauses), not the raw pages, so every claim is grounded in already-verified facts.
 * In P2 this stage will also see risk assessments. Idempotent: upserts the analysis.
 */
export class SummariseStage implements Stage {
  readonly name = "summarise" as const;

  constructor(
    private readonly llm: LlmPort,
    private readonly clauses: ClauseRepo,
    private readonly analyses: AnalysisRepo,
  ) {}

  async run(ctx: StageContext): Promise<Result<StageOutput>> {
    const { contract } = ctx;
    try {
      const clauses = await this.clauses.listByContract(contract.id);
      const { prompt, refToClauseId } = buildSummaryPrompt(contract, clauses);

      const { object, model } = await this.llm.generate({
        task: "summarise",
        schema: SummarySchema,
        system: SUMMARY_SYSTEM,
        prompt,
        context: {
          contractId: contract.id,
          stage: "summarise",
          promptVersion: PROMPT_VERSIONS.summarise,
        },
      });

      const topIssues = object.topIssues.map((ti) => ({
        ...ti,
        clauseIds: ti.clauseRefs
          .map((r) => refToClauseId.get(r))
          .filter((id): id is string => Boolean(id)),
      }));

      await this.analyses.save({
        contractId: contract.id,
        overview: object.overview,
        whoCarriesRisk: object.whoCarriesRisk,
        keyTerms: object.keyTerms,
        topIssues,
        modelVersions: { summarise: model },
      });
      return ok({ produced: topIssues.length });
    } catch (cause) {
      return err(new AppError("pipeline_failed", `summarise failed for ${contract.id}`, cause));
    }
  }
}
