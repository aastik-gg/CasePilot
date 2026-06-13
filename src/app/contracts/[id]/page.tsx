import { notFound } from "next/navigation";
import { currentActor } from "@/infrastructure/auth";
import { getContainer } from "@/composition/container";
import { IngestStatus } from "@/app/(ui)/components/IngestStatus";
import { ContractTabs } from "@/app/(ui)/components/ContractTabs";
import { SummaryPanel } from "@/app/(ui)/components/SummaryPanel";
import { ClauseList } from "@/app/(ui)/components/ClauseList";
import { DocumentTree } from "@/app/(ui)/components/DocumentTree";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) return null;

  const { id } = await params;
  const { contracts, nodes, clauses, assessments, analyses } = getContainer();
  const contract = await contracts.findById(actor.orgId, id);
  if (!contract) notFound();

  const ready = contract.status === "ready";
  const [tree, clauseList, assessmentList, analysis] = ready
    ? await Promise.all([
        nodes.listByContract(id),
        clauses.listByContract(id),
        assessments.listByContract(id),
        analyses.getByContract(id),
      ])
    : [[], [], [], null];

  // Cross-reference maps so the Clause Explorer can show § numbers and the Document View can
  // wash clauses by risk and link back to the matching clause card.
  const numberByNodeId = new Map(tree.map((n) => [n.id, n.numberLabel] as const));
  const assessmentByClauseId = new Map(assessmentList.map((a) => [a.clauseId, a] as const));
  const riskByNodeId = new Map<string, { severity: string | null; clauseId: string }>();
  for (const c of clauseList) {
    const a = assessmentByClauseId.get(c.id);
    for (const nodeId of c.nodeIds) {
      riskByNodeId.set(nodeId, { severity: a?.severity ?? null, clauseId: c.id });
    }
  }

  return (
    <div className="w-full">
      <p className="eyebrow">Contract</p>
      <h1 className="mt-2 text-3xl text-[var(--ink)]">{contract.title}</h1>
      <p className="mono mt-1 text-xs text-[var(--ink-3)]">
        {contract.originalFilename}
        {contract.pageCount ? ` · ${contract.pageCount} pages` : ""}
      </p>

      <div className="mt-6">
        <IngestStatus contractId={contract.id} initial={contract.status} />
      </div>

      {ready && (
        <div className="mt-8">
          <ContractTabs
            clauseCount={clauseList.length}
            summary={
              <div>
                <div className="mb-4 flex items-baseline justify-between">
                  <p className="eyebrow">Executive summary</p>
                  {analysis && (
                    <a
                      href={`/api/contracts/${contract.id}/summary.md`}
                      className="text-sm text-[var(--claret)] underline-offset-4 hover:underline"
                    >
                      Export ↓
                    </a>
                  )}
                </div>
                <SummaryPanel analysis={analysis} />
              </div>
            }
            clauses={
              <ClauseList
                clauses={clauseList}
                assessments={assessmentList}
                numberByNodeId={numberByNodeId}
              />
            }
            document={<DocumentTree nodes={tree} riskByNodeId={riskByNodeId} />}
          />
        </div>
      )}
    </div>
  );
}
