import { env } from "@/infrastructure/env";
import { DrizzleContractRepo, DrizzleDocumentNodeRepo } from "@/infrastructure/db/repositories";
import { R2StorageAdapter } from "@/infrastructure/storage/R2StorageAdapter";
import { DocumentParser } from "@/infrastructure/parsing/DocumentParser";
import { QStashQueueAdapter } from "@/infrastructure/queue/QStashQueueAdapter";
import { InlineQueueAdapter } from "@/infrastructure/queue/InlineQueueAdapter";
import { RedisStateStore } from "@/infrastructure/queue/RedisStateStore";
import { InMemoryStateStore } from "@/infrastructure/queue/InMemoryStateStore";
import { IngestStage } from "@/application/pipeline/IngestStage";
import { PipelineRunner } from "@/application/PipelineRunner";
import { RegisterContractUseCase } from "@/application/RegisterContractUseCase";
import type { Stage, StageName } from "@/domain/ports/Stage";
import type { ContractRepo, DocumentNodeRepo } from "@/domain/ports/repositories";
import type { QueuePort, StoragePort } from "@/domain/ports/services";

/**
 * Composition Root: the ONLY place concrete adapters meet ports. Everything else receives its
 * dependencies. Swapping R2→S3, QStash→another queue, etc. is a one-line change here.
 */
export interface Container {
  contracts: ContractRepo;
  nodes: DocumentNodeRepo;
  storage: StoragePort;
  runner: PipelineRunner;
  registerContract: RegisterContractUseCase;
}

let _container: Container | null = null;

export function getContainer(): Container {
  if (_container) return _container;

  const contracts = new DrizzleContractRepo();
  const nodes = new DrizzleDocumentNodeRepo();
  const storage = new R2StorageAdapter();
  const parser = new DocumentParser();
  const state = env.hasRedis() ? new RedisStateStore() : new InMemoryStateStore();

  // Prod: durable QStash dispatch. Local dev (no QStash): run stages inline in-process.
  const inline = env.hasQueue() ? null : new InlineQueueAdapter();
  const queue: QueuePort = inline ?? new QStashQueueAdapter();

  const stages = new Map<StageName, Stage>([
    ["ingest", new IngestStage(storage, parser, contracts, nodes)],
    // P1 appends: ["extract", …]; P2: ["benchmark", …], ["score", …]; etc.
  ]);

  const runner = new PipelineRunner(stages, contracts, state, queue);
  inline?.setDispatch((s, c, o) => runner.runStage(s, c, o));

  const registerContract = new RegisterContractUseCase(contracts, queue);

  _container = { contracts, nodes, storage, runner, registerContract };
  return _container;
}
