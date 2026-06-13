import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { env } from "@/infrastructure/env";
import { getContainer } from "@/composition/container";
import { STAGE_NAMES, type StageName } from "@/domain/ports/Stage";

/**
 * QStash-driven stage callback (TECH_SPEC §5). Public route — authenticated by QStash signature,
 * not Clerk. Runs exactly one pipeline stage, then the runner enqueues the next.
 */
export async function POST(req: Request, { params }: { params: Promise<{ stage: string }> }) {
  const { stage } = await params;
  if (!STAGE_NAMES.includes(stage as StageName)) {
    return NextResponse.json({ error: "unknown stage" }, { status: 400 });
  }

  const raw = await req.text();

  const keys = env.qstash().signingKeys;
  if (keys.current) {
    const receiver = new Receiver({
      currentSigningKey: keys.current,
      nextSigningKey: keys.next ?? keys.current,
    });
    const signature = req.headers.get("upstash-signature") ?? "";
    const valid = await receiver.verify({ signature, body: raw }).catch(() => false);
    if (!valid) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const { contractId, orgId } = JSON.parse(raw) as { contractId: string; orgId: string };
  await getContainer().runner.runStage(stage as StageName, contractId, orgId);
  return NextResponse.json({ ok: true });
}
