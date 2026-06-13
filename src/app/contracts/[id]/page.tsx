import { notFound } from "next/navigation";
import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";
import { IngestStatus } from "@/app/(ui)/components/IngestStatus";
import { DocumentTree } from "@/app/(ui)/components/DocumentTree";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) return null;

  const { id } = await params;
  const { contracts, nodes } = getContainer();
  const contract = await contracts.findById(actor.orgId, id);
  if (!contract) notFound();

  const tree = contract.status === "ready" ? await nodes.listByContract(id) : [];

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Contract</p>
      <h1 className="mt-2 text-3xl text-[var(--ink)]">{contract.title}</h1>
      <p className="mono mt-1 text-xs text-[var(--ink-3)]">
        {contract.originalFilename}
        {contract.pageCount ? ` · ${contract.pageCount} pages` : ""}
      </p>

      <div className="mt-6">
        <IngestStatus contractId={contract.id} initial={contract.status} />
      </div>

      <section className="mt-10">
        <p className="eyebrow mb-3">Structure</p>
        <DocumentTree nodes={tree} />
      </section>
    </div>
  );
}
