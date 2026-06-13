import type { LlmTask } from "@/domain/ports/llm";

export interface ModelConfig {
  modelId: string;
  /** Passed through as `providerOptions.anthropic` (TECH_SPEC §4.1). */
  providerOptions: Record<string, unknown>;
}

/**
 * Factory: maps a task to a model + thinking/effort config (TECH_SPEC §2.2 "Factory").
 * Reasoning tasks use Opus 4.8 with adaptive thinking + native structured outputs (the combination
 * that works with Opus 4.8 — `outputFormat` avoids the forced-tool-choice/thinking conflict).
 * Haiku is reserved for a future triage task; it isn't wired until that task exists (no dead config).
 */
export class ModelRouter {
  forTask(task: LlmTask): ModelConfig {
    switch (task) {
      case "extract":
      case "benchmark":
      case "score":
      case "summarise":
      case "compare":
        return {
          modelId: "claude-opus-4-8",
          providerOptions: {
            thinking: { type: "adaptive" },
            effort: "high",
            structuredOutputMode: "outputFormat",
          },
        };
    }
  }
}
