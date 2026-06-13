import { AppError, err, ok, type Result } from "@/domain/result";
import type { Stage, StageContext, StageOutput } from "@/domain/ports/Stage";
import type { StoragePort } from "@/domain/ports/services";
import type { DocumentParserPort } from "@/domain/ports/parsing";
import type { ContractRepo, DocumentNodeRepo } from "@/domain/ports/repositories";

/**
 * Stage 0 — Ingest & Structure (TECH_SPEC §4). No LLM.
 * Reads the uploaded file from storage, parses it into a structured tree (preserving hierarchy,
 * numbering, cross-references), and persists it. Idempotent: re-running overwrites the tree.
 */
export class IngestStage implements Stage {
  readonly name = "ingest" as const;

  constructor(
    private readonly storage: StoragePort,
    private readonly parser: DocumentParserPort,
    private readonly contracts: ContractRepo,
    private readonly nodes: DocumentNodeRepo,
  ) {}

  async run(ctx: StageContext): Promise<Result<StageOutput>> {
    const { contract } = ctx;
    try {
      const bytes = await this.storage.getBytes(contract.r2Key);
      const parsed = await this.parser.parse({ bytes, mimeType: contract.mimeType });
      await this.nodes.saveTree(contract.id, parsed);
      await this.contracts.setPageCount(contract.orgId, contract.id, parsed.pageCount);
      return ok({ produced: parsed.nodes.length });
    } catch (cause) {
      return err(new AppError("parse_failed", `ingest failed for ${contract.id}`, cause));
    }
  }
}
