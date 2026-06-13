import type { StageName } from "@/domain/ports/Stage";
import type { StateStorePort } from "@/domain/ports/services";

/**
 * Local-dev fallback when Redis isn't configured. Process-local — fine for `next dev` with the
 * inline queue (same process); not for production (use RedisStateStore there).
 */
export class InMemoryStateStore implements StateStorePort {
  private state = new Map<string, Record<string, string>>();
  private locks = new Set<string>();

  async setStage(contractId: string, stage: StageName, status: string): Promise<void> {
    const cur = this.state.get(contractId) ?? {};
    cur[stage] = status;
    this.state.set(contractId, cur);
  }

  async getState(contractId: string): Promise<Record<string, string> | null> {
    return this.state.get(contractId) ?? null;
  }

  async acquire(contractId: string, stage: StageName): Promise<boolean> {
    const key = `${contractId}:${stage}`;
    if (this.locks.has(key)) return false;
    this.locks.add(key);
    return true;
  }

  async release(contractId: string, stage: StageName): Promise<void> {
    this.locks.delete(`${contractId}:${stage}`);
  }
}
