import { AppError, isOk } from "@/domain/result";
import { STAGE_ORDER, type Stage, type StageName } from "@/domain/ports/Stage";
import type { QueuePort, StateStorePort } from "@/domain/ports/services";
import type { ContractRepo } from "@/domain/ports/repositories";

/**
 * Drives the analysis pipeline one stage per invocation (TECH_SPEC §4).
 * Each call: lock (idempotency) → run the stage → persist → enqueue the next stage (or mark ready).
 * Resumable and safe to retry; serverless-friendly (one short stage per function call).
 *
 * Pipeline + Chain-of-Responsibility: stages are uniform `Stage`s; the runner advances the chain.
 */
export class PipelineRunner {
  constructor(
    private readonly stages: ReadonlyMap<StageName, Stage>,
    private readonly contracts: ContractRepo,
    private readonly state: StateStorePort,
    private readonly queue: QueuePort,
  ) {}

  async runStage(stage: StageName, contractId: string, orgId: string): Promise<void> {
    const impl = this.stages.get(stage);
    if (!impl) throw new AppError("pipeline_failed", `no stage registered: ${stage}`);

    // Idempotency: if another invocation already claimed this (contract, stage), bail.
    if (!(await this.state.acquire(contractId, stage))) return;

    try {
      const contract = await this.contracts.findById(orgId, contractId);
      if (!contract) throw new AppError("not_found", `contract ${contractId}`);

      const isFirst = STAGE_ORDER.indexOf(stage) === 0;
      await this.contracts.setStatus(orgId, contractId, isFirst ? "parsing" : "analyzing");
      await this.state.setStage(contractId, stage, "running");

      const result = await impl.run({ contract });
      if (!isOk(result)) {
        await this.contracts.setStatus(orgId, contractId, "failed");
        await this.state.setStage(contractId, stage, "failed");
        return;
      }

      await this.state.setStage(contractId, stage, "done");
      const next = this.nextStage(stage);
      if (next) {
        await this.queue.enqueue(next, contractId, orgId);
      } else {
        await this.contracts.setStatus(orgId, contractId, "ready");
      }
    } finally {
      await this.state.release(contractId, stage);
    }
  }

  private nextStage(current: StageName): StageName | null {
    const i = STAGE_ORDER.indexOf(current);
    if (i < 0 || i + 1 >= STAGE_ORDER.length) return null;
    return STAGE_ORDER[i + 1];
  }
}
