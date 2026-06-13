import type { z } from "zod";

/** Tasks the LLM performs. Each maps (in the ModelRouter) to a model + effort/thinking config. */
export type LlmTask = "extract" | "benchmark" | "score" | "summarise" | "compare";

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmGenerateArgs<T> {
  task: LlmTask;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  /** For audit logging (llm_calls). */
  context?: { contractId: string; stage: string; promptVersion: string };
}

export interface LlmResult<T> {
  object: T;
  usage: LlmUsage;
  model: string;
}

/**
 * The LLM behind a port: schema-validated structured generation only (no free-form agents).
 * Implemented by an infrastructure adapter (Vercel AI SDK). Domain/application never see the SDK.
 */
export interface LlmPort {
  generate<T>(args: LlmGenerateArgs<T>): Promise<LlmResult<T>>;
}
