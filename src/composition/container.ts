import { env } from "@/infrastructure/env";
import {
  DrizzleAnalysisRepo,
  DrizzleClauseRepo,
  DrizzleContractRepo,
  DrizzleDocumentNodeRepo,
  DrizzleLlmCallRepo,
} from "@/infrastructure/db/repositories";
import { R2StorageAdapter } from "@/infrastructure/storage/R2StorageAdapter";
import { DocumentParser } from "@/infrastructure/parsing/DocumentParser";
import { QStashQueueAdapter } from "@/infrastructure/queue/QStashQueueAdapter";
import { InlineQueueAdapter } from "@/infrastructure/queue/InlineQueueAdapter";
import { RedisStateStore } from "@/infrastructure/queue/RedisStateStore";
import { InMemoryStateStore } from "@/infrastructure/queue/InMemoryStateStore";
import { ModelRouter } from "@/infrastructure/llm/ModelRouter";
import { AiSdkLlmAdapter } from "@/infrastructure/llm/AiSdkLlmAdapter";
import { IngestStage } from "@/application/pipeline/IngestStage";
import { ExtractStage } from "@/application/pipeline/ExtractStage";
import { SummariseStage } from "@/application/pipeline/SummariseStage";
import { PipelineRunner } from "@/application/PipelineRunner";
import { RegisterContractUseCase } from "@/application/RegisterContractUseCase";
import type { Stage, StageName } from "@/domain/ports/Stage";
import type {
  AnalysisRepo,
  ClauseRepo,
  ContractRepo,
  DocumentNodeRepo,
} from "@/domain/ports/repositories";
import type { QueuePort, StoragePort } from "@/domain/ports/services";

/**
 * Composition Root: the ONLY place concrete adapters meet ports. Everything else receives its
 * dependencies. Swapping R2→S3, QStash→another queue, Anthropic→another model, etc. is local here.
 */
export interface Container {
  contracts: ContractRepo;
  nodes: DocumentNodeRepo;
  clauses: ClauseRepo;
  analyses: AnalysisRepo;
  storage: StoragePort;
  runner: PipelineRunner;
  registerContract: RegisterContractUseCase;
}

let _container: Container | null = null;

export function getContainer(): Container {
  if (_container) return _container;

  const contracts = new DrizzleContractRepo();
  const nodes = new DrizzleDocumentNodeRepo();
  const clauses = new DrizzleClauseRepo();
  const analyses = new DrizzleAnalysisRepo();
  const llmCalls = new DrizzleLlmCallRepo();
  const storage = new R2StorageAdapter();
  const parser = new DocumentParser();
  const llm = new AiSdkLlmAdapter(new ModelRouter(), llmCalls);
  const state = env.hasRedis() ? new RedisStateStore() : new InMemoryStateStore();

  // Prod: durable QStash dispatch. Local dev (no QStash): run stages inline in-process.
  const inline = env.hasQueue() ? null : new InlineQueueAdapter();
  const queue: QueuePort = inline ?? new QStashQueueAdapter();

  const stages = new Map<StageName, Stage>([
    ["ingest", new IngestStage(storage, parser, contracts, nodes)],
    ["extract", new ExtractStage(llm, nodes, clauses)],
    ["summarise", new SummariseStage(llm, clauses, analyses)],
    // P2 appends: ["benchmark", …], ["score", …] (before summarise in STAGE_ORDER).
  ]);

  const runner = new PipelineRunner(stages, contracts, state, queue);
  inline?.setDispatch((s, c, o) => runner.runStage(s, c, o));

  const registerContract = new RegisterContractUseCase(contracts, queue);

  _container = { contracts, nodes, clauses, analyses, storage, runner, registerContract };
  return _container;
}
