import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";

/** Issues a presigned R2 PUT so the browser uploads the file directly (never via the server). */
export async function POST(req: Request) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { filename, contentType } = await req.json();
  if (typeof filename !== "string" || typeof contentType !== "string") {
    return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
  }

  // Key is org-scoped + unguessable; original name kept for display only.
  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  const key = `${actor.orgId}/${randomUUID()}/${safeName}`;
  const { url } = await getContainer().storage.presignUpload({ key, contentType });
  return NextResponse.json({ url, key });
}
