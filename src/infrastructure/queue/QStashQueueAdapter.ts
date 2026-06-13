import { Client } from "@upstash/qstash";
import { env } from "@/infrastructure/env";
import type { StageName } from "@/domain/ports/Stage";
import type { QueuePort } from "@/domain/ports/services";

/**
 * Durable stage dispatch in production: publishes an HTTP message that QStash later POSTs to
 * /api/jobs/[stage]. Survives function timeouts; QStash retries on failure.
 */
export class QStashQueueAdapter implements QueuePort {
  private client = new Client({ token: env.qstash().token! });

  async enqueue(stage: StageName, contractId: string, orgId: string): Promise<void> {
    await this.client.publishJSON({
      url: `${env.appUrl()}/api/jobs/${stage}`,
      body: { contractId, orgId },
      retries: 3,
    });
  }
}
