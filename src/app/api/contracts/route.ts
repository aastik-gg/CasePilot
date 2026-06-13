import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";
import { isOk } from "@/domain/result";

/** Register an uploaded file as a contract and start ingestion. */
export async function POST(req: Request) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await getContainer().registerContract.execute(actor.orgId, actor.userId, body);
    if (!isOk(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 422 });
    }
    return NextResponse.json(result.value, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "validation", issues: e.issues }, { status: 400 });
    }
    throw e;
  }
}

/** List the current org's contracts (the docket). */
export async function GET() {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const contracts = await getContainer().contracts.list(actor.orgId);
  return NextResponse.json(contracts);
}
