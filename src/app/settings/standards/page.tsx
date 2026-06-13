import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";
import { StandardsEditor } from "@/app/(ui)/components/StandardsEditor";

export default async function StandardsPage() {
  const actor = await currentActor();
  if (!actor) return null;

  const standards = await getContainer().marketStandards.list(actor.orgId);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Configuration</p>
      <h1 className="mt-2 text-3xl text-[var(--ink)]">Market-standard baseline</h1>
      <p className="mt-2 text-[var(--ink-2)]">
        The baseline CasePilot benchmarks clauses against. Defaults apply until you save an override
        for your organization.
      </p>
      <div className="mt-8">
        <StandardsEditor initial={standards} />
      </div>
    </div>
  );
}
