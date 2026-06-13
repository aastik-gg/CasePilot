import Link from "next/link";
import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";
import { Dropzone } from "@/app/(ui)/components/Dropzone";

export default async function Home() {
  const actor = await currentActor();
  if (!actor) return null; // proxy.ts protects this route; render nothing if somehow unauthenticated
  const contracts = await getContainer().contracts.list(actor.orgId);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Contract analysis</p>
      <h1 className="mt-2 text-4xl text-[var(--ink)]">
        Find the risk before your lawyer does.
      </h1>
      <p className="mt-3 max-w-xl text-[var(--ink-2)]">
        Upload a contract. CasePilot structures it, extracts the clauses that matter, and surfaces
        the 10% that needs a human decision.
      </p>

      <div className="mt-8">
        <Dropzone />
      </div>

      <section className="mt-12">
        <p className="eyebrow mb-3">Docket</p>
        {contracts.length === 0 ? (
          <p className="text-sm text-[var(--ink-3)]">No contracts yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--paper-edge)] border-y border-[var(--paper-edge)]">
            {contracts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contracts/${c.id}`}
                  className="flex items-center justify-between py-3 hover:bg-[var(--paper-2)]"
                >
                  <span className="text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
                    {c.title}
                  </span>
                  <span className="mono text-xs text-[var(--ink-3)]">
                    {c.pageCount ? `${c.pageCount}p · ` : ""}
                    {c.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
