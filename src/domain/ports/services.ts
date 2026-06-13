import type { StageName } from "@/domain/ports/Stage";

/** Narrow, segregated ports (ISP). Infrastructure adapters implement these; nothing else may. */

/** Object storage (Cloudflare R2). */
export interface StoragePort {
  /** Presigned PUT so the browser uploads straight to R2 — the file never transits the server. */
  presignUpload(input: {
    key: string;
    contentType: string;
  }): Promise<{ url: string }>;
  getBytes(key: string): Promise<Uint8Array>;
}

/** Durable stage dispatch. QStash in prod; an inline adapter in local dev. */
export interface QueuePort {
  enqueue(stage: StageName, contractId: string, orgId: string): Promise<void>;
}

/** Live pipeline state + idempotency locks (Upstash Redis). */
export interface StateStorePort {
  setStage(contractId: string, stage: StageName, status: string): Promise<void>;
  getState(contractId: string): Promise<Record<string, string> | null>;
  /** Returns true if the lock was acquired (i.e. this stage hasn't already run/started). */
  acquire(contractId: string, stage: StageName): Promise<boolean>;
  release(contractId: string, stage: StageName): Promise<void>;
}
