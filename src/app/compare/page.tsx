import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";
import { CompareTool } from "@/app/(ui)/components/CompareTool";

export default async function ComparePage() {
  const actor = await currentActor();
  if (!actor) return null;

  const all = await getContainer().contracts.list(actor.orgId);
  const ready = all.filter((c) => c.status === "ready").map((c) => ({ id: c.id, title: c.title }));

  return (
    <div className="w-full">
      <p className="eyebrow">Due diligence</p>
      <h1 className="mt-2 text-3xl text-[var(--ink)]">Compare a clause across contracts</h1>
      <p className="mt-2 text-[var(--ink-2)]">
        Pick a clause type and two or more analyzed contracts to see them side by side.
      </p>

      <div className="mt-8">
        {ready.length < 2 ? (
          <p className="text-sm text-[var(--ink-3)]">
            You need at least two analyzed contracts to compare. Upload and analyze more first.
          </p>
        ) : (
          <CompareTool contracts={ready} />
        )}
      </div>
    </div>
  );
}
