import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LlmGenerateArgs, LlmPort, LlmResult } from "@/domain/ports/llm";
import type { LlmCallRepo } from "@/domain/ports/repositories";
import type { ModelRouter } from "@/infrastructure/llm/ModelRouter";

/**
 * The only place the Vercel AI SDK is imported. Schema-validated structured generation via
 * `generateObject`; logs usage to llm_calls for the $/document audit trail (TECH_SPEC §4.1).
 */
export class AiSdkLlmAdapter implements LlmPort {
  constructor(
    private readonly router: ModelRouter,
    private readonly calls?: LlmCallRepo,
  ) {}

  async generate<T>({ task, schema, system, prompt, context }: LlmGenerateArgs<T>): Promise<LlmResult<T>> {
    const { modelId, providerOptions } = this.router.forTask(task);

    const { object, usage } = await generateObject({
      model: anthropic(modelId),
      schema,
      system,
      prompt,
      providerOptions: { anthropic: providerOptions } as never,
    });

    const u = { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 };
    if (context && this.calls) {
      await this.calls.log({
        contractId: context.contractId,
        stage: context.stage,
        model: modelId,
        promptVersion: context.promptVersion,
        usage: u,
      });
    }
    return { object: object as T, usage: u, model: modelId };
  }
}
