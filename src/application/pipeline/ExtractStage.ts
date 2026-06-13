import { AppError, err, ok, type Result } from "@/domain/result";
import type { Stage, StageContext, StageOutput } from "@/domain/ports/Stage";
import type { LlmPort } from "@/domain/ports/llm";
import type { EmbeddingPort } from "@/domain/ports/embedding";
import type {
  ClauseEmbeddingRepo,
  ClauseRepo,
  DocumentNodeRepo,
  NewClause,
} from "@/domain/ports/repositories";
import { ClauseExtractionSchema } from "@/domain/schemas/clause";
import { EXTRACT_SYSTEM, PROMPT_VERSIONS, buildExtractPrompt } from "@/application/pipeline/prompts";

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/**
 * Stage 1 — Clause Extraction (TECH_SPEC §4, PRD F2). Opus 4.8 extracts the named clause types as
 * structured output; results are grounded (verbatim text must appear in the source, or be anchored
 * to a real node) before persisting. Idempotent: replaces the contract's clauses.
 */
export class ExtractStage implements Stage {
  readonly name = "extract" as const;

  constructor(
    private readonly llm: LlmPort,
    private readonly nodes: DocumentNodeRepo,
    private readonly clauses: ClauseRepo,
    private readonly embeddings?: EmbeddingPort,
    private readonly clauseEmbeddings?: ClauseEmbeddingRepo,
  ) {}

  async run(ctx: StageContext): Promise<Result<StageOutput>> {
    const { contract } = ctx;
    try {
      const nodes = await this.nodes.listByContract(contract.id);
      if (nodes.length === 0) return ok({ produced: 0 });

      const { prompt, refToNodeId } = buildExtractPrompt(nodes);
      const { object } = await this.llm.generate({
        task: "extract",
        schema: ClauseExtractionSchema,
        system: EXTRACT_SYSTEM,
        prompt,
        context: { contractId: contract.id, stage: "extract", promptVersion: PROMPT_VERSIONS.extract },
      });

      const docText = normalize(nodes.map((n) => n.text).join("\n"));
      const nodeById = new Map(nodes.map((n) => [n.id, n] as const));

      const out: NewClause[] = [];
      for (const c of object.clauses) {
        const nodeIds = c.nodeRefs
          .map((r) => refToNodeId.get(r))
          .filter((id): id is string => Boolean(id));
        const grounded = docText.includes(normalize(c.verbatimText));
        if (!grounded && nodeIds.length === 0) continue; // hallucination guard (PRD §5 grounding)

        out.push({
          contractId: contract.id,
          clauseType: c.clauseType,
          nodeIds,
          verbatimText: c.verbatimText,
          confidence: clamp(c.confidence),
          pageAnchor: nodeIds.length ? (nodeById.get(nodeIds[0])?.pageStart ?? null) : null,
        });
      }

      await this.clauses.replaceForContract(contract.id, out);
      await this.embedClauses(contract.id);
      return ok({ produced: out.length });
    } catch (cause) {
      return err(new AppError("pipeline_failed", `extract failed for ${contract.id}`, cause));
    }
  }

  /** Optional: store clause embeddings for cross-contract alignment (bonus). No-op without a provider. */
  private async embedClauses(contractId: string): Promise<void> {
    if (!this.embeddings?.enabled() || !this.clauseEmbeddings) return;
    const saved = await this.clauses.listByContract(contractId);
    if (saved.length === 0) return;
    const vectors = await this.embeddings.embed(saved.map((c) => c.verbatimText));
    if (vectors.length !== saved.length) return;
    await this.clauseEmbeddings.replaceForContract(
      contractId,
      saved.map((c, i) => ({ clauseId: c.id, clauseType: c.clauseType, embedding: vectors[i] })),
    );
  }
}
