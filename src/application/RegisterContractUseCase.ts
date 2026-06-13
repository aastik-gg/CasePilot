import { ok, type Result } from "@/domain/result";
import { RegisterContractInput, type Contract } from "@/domain/schemas/contract";
import type { ContractRepo } from "@/domain/ports/repositories";
import type { QueuePort } from "@/domain/ports/services";

/**
 * Registers an uploaded file as a contract and kicks off ingestion.
 * Application use-case: orchestrates ports only; no SDK, no SQL, no framework.
 */
export class RegisterContractUseCase {
  constructor(
    private readonly contracts: ContractRepo,
    private readonly queue: QueuePort,
  ) {}

  async execute(
    orgId: string,
    ownerId: string,
    rawInput: unknown,
  ): Promise<Result<Contract>> {
    const input = RegisterContractInput.parse(rawInput); // validates; throws ZodError → 400 at route
    const contract = await this.contracts.create(orgId, ownerId, input);
    await this.queue.enqueue("ingest", contract.id, orgId);
    return ok(contract);
  }
}
