import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";

export const dynamic = "force-dynamic";

/** SSE: streams contract status until ready/failed (PRD F1.5). The UI advances its stepper from this. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) return new Response("unauthorized", { status: 401 });

  const { id } = await params;
  const { contracts } = getContainer();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let aborted = false;
      req.signal.addEventListener("abort", () => (aborted = true));
      const send = (status: string) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ status })}\n\n`));

      while (!aborted) {
        const contract = await contracts.findById(actor.orgId, id);
        if (!contract) {
          send("failed");
          break;
        }
        send(contract.status);
        if (contract.status === "ready" || contract.status === "failed") break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
