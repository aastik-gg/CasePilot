import type { StageName } from "@/domain/ports/Stage";
import type { QueuePort } from "@/domain/ports/services";

type Dispatch = (stage: StageName, contractId: string, orgId: string) => Promise<void>;

/**
 * Local-dev fallback when QStash isn't configured: runs the next stage in-process
 * (fire-and-forget) instead of over HTTP. The runner is injected post-construction to
 * avoid a constructor cycle (runner → queue → runner).
 */
export class InlineQueueAdapter implements QueuePort {
  private dispatch: Dispatch | null = null;

  setDispatch(fn: Dispatch): void {
    this.dispatch = fn;
  }

  async enqueue(stage: StageName, contractId: string, orgId: string): Promise<void> {
    const run = this.dispatch;
    if (!run) throw new Error("InlineQueueAdapter: dispatch not wired");
    // Fire-and-forget: don't block the HTTP response on the whole pipeline.
    void run(stage, contractId, orgId).catch((e) =>
      console.error(`[inline-queue] stage ${stage} for ${contractId} failed`, e),
    );
  }
}
