import { Redis } from "@upstash/redis";
import { env } from "@/infrastructure/env";
import type { StageName } from "@/domain/ports/Stage";
import type { StateStorePort } from "@/domain/ports/services";

/** Live pipeline state + idempotency locks in Upstash Redis. */
export class RedisStateStore implements StateStorePort {
  private redis: Redis;
  constructor() {
    const c = env.redis();
    this.redis = new Redis({ url: c.url!, token: c.token! });
  }

  private stateKey = (id: string) => `pipeline:${id}`;
  private lockKey = (id: string, stage: StageName) => `lock:${id}:${stage}`;

  async setStage(contractId: string, stage: StageName, status: string): Promise<void> {
    await this.redis.hset(this.stateKey(contractId), { [stage]: status });
  }

  async getState(contractId: string): Promise<Record<string, string> | null> {
    const v = await this.redis.hgetall<Record<string, string>>(this.stateKey(contractId));
    return v ?? null;
  }

  async acquire(contractId: string, stage: StageName): Promise<boolean> {
    // SET NX with TTL: only one invocation runs a given (contract, stage) at a time.
    const res = await this.redis.set(this.lockKey(contractId, stage), "1", { nx: true, ex: 600 });
    return res === "OK";
  }

  async release(contractId: string, stage: StageName): Promise<void> {
    await this.redis.del(this.lockKey(contractId, stage));
  }
}
