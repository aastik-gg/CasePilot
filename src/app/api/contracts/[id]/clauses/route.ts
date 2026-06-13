import { NextResponse } from "next/server";
import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { contracts, clauses } = getContainer();
  const contract = await contracts.findById(actor.orgId, id);
  if (!contract) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(await clauses.listByContract(id));
}
