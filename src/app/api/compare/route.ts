import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";
import { CompareInput } from "@/domain/schemas/compare";
import { isOk } from "@/domain/result";

/** Side-by-side clause comparison across contracts (PRD F6). */
export async function POST(req: Request) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { clauseType, contractIds } = CompareInput.parse(await req.json());
    const result = await getContainer().compareClauses.execute(actor.orgId, clauseType, contractIds);
    if (!isOk(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 422 });
    }
    return NextResponse.json(result.value);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "validation", issues: e.issues }, { status: 400 });
    }
    throw e;
  }
}
