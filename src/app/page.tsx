import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";
import { Dropzone } from "@/app/(ui)/components/Dropzone";
import { Docket } from "@/app/(ui)/components/Docket";

export default async function Home() {
  const actor = await currentActor();
  if (!actor) return null; // proxy.ts protects this route; render nothing if somehow unauthenticated
  const contracts = await getContainer().contracts.list(actor.orgId);

  return (
    <div>
      <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] max-lg:gap-8">
        <div>
          <p className="eyebrow">Contract analysis</p>
          <h1 className="mt-2 text-5xl leading-[1.05] text-[var(--ink)] max-md:text-4xl">
            Find the risk before your lawyer does.
          </h1>
          <p className="mt-4 max-w-md text-lg text-[var(--ink-2)]">
            Upload a contract. CasePilot structures it, extracts the clauses that matter, and surfaces
            the 10% that needs a human decision.
          </p>
        </div>
        <Dropzone />
      </section>

      <Docket
        contracts={contracts.map((c) => ({
          id: c.id,
          title: c.title,
          pageCount: c.pageCount,
          status: c.status,
        }))}
      />
    </div>
  );
}
