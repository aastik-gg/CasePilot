import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { env } from "@/infrastructure/env";
import type { EmbeddingPort } from "@/domain/ports/embedding";

/** Embeddings via OpenAI text-embedding-3-small (1536 dims). Enabled only when OPENAI_API_KEY is set. */
export class OpenAiEmbeddingAdapter implements EmbeddingPort {
  readonly dimensions = 1536;
  enabled() {
    return env.hasEmbeddings();
  }
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const { embeddings } = await embedMany({
      model: openai.textEmbeddingModel("text-embedding-3-small"),
      values: texts,
    });
    return embeddings;
  }
}

/** No-op embeddings when no provider is configured — keeps the pipeline working without a key. */
export class NullEmbeddingAdapter implements EmbeddingPort {
  readonly dimensions = 1536;
  enabled() {
    return false;
  }
  async embed(): Promise<number[][]> {
    return [];
  }
}
