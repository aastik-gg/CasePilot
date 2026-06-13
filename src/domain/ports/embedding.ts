/**
 * Text embeddings for cross-contract clause alignment (PRD bonus). Optional — when disabled,
 * compare falls back to clause-type matching. Anthropic has no embeddings API, so the adapter
 * uses a separate provider behind this port.
 */
export interface EmbeddingPort {
  enabled(): boolean;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
