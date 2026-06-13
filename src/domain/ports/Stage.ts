import type { Result } from "@/domain/result";
import type { Contract } from "@/domain/schemas/contract";

/**
 * Pipeline vocabulary. The full analysis pipeline is ingest → extract → benchmark → score → summarise
 * (TECH_SPEC §4). Stages are registered as they are built; STAGE_ORDER drives the runner.
 */
export const STAGE_NAMES = [
  "ingest",
  "extract",
  "benchmark",
  "score",
  "summarise",
] as const;
export type StageName = (typeof STAGE_NAMES)[number];

/** Stages active in the current phase. Later phases append their stage name here. */
export const STAGE_ORDER: readonly StageName[] = ["ingest"]; // P0

export interface StageContext {
  readonly contract: Contract;
}

export interface StageOutput {
  readonly produced: number; // count of artifacts written (nodes, clauses, …) — for logging/telemetry
}

/**
 * One unit of work in the pipeline. Single Responsibility: a stage does exactly one transformation,
 * is idempotent (safe to retry), and depends only on ports — never on infrastructure directly.
 */
export interface Stage {
  readonly name: StageName;
  run(ctx: StageContext): Promise<Result<StageOutput>>;
}
