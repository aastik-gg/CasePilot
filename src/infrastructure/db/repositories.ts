import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/infrastructure/db/client";
import { contracts, crossReferences, documentNodes } from "@/infrastructure/db/schema";
import type { ContractRepo, DocumentNodeRepo } from "@/domain/ports/repositories";
import type { Contract, ContractStatus, RegisterContractInput } from "@/domain/schemas/contract";
import type { CrossReference, DocumentNode, ParsedDocument } from "@/domain/schemas/document";

type ContractRow = typeof contracts.$inferSelect;

const toContract = (r: ContractRow): Contract => ({
  id: r.id,
  orgId: r.orgId,
  ownerId: r.ownerId,
  title: r.title,
  partyPerspective: r.partyPerspective as Contract["partyPerspective"],
  originalFilename: r.originalFilename,
  mimeType: r.mimeType,
  r2Key: r.r2Key,
  pageCount: r.pageCount,
  status: r.status as ContractStatus,
  createdAt: r.createdAt,
});

export class DrizzleContractRepo implements ContractRepo {
  async create(orgId: string, ownerId: string, input: RegisterContractInput): Promise<Contract> {
    const [row] = await db()
      .insert(contracts)
      .values({
        orgId,
        ownerId,
        title: input.title,
        partyPerspective: input.partyPerspective,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        r2Key: input.r2Key,
        status: "uploaded",
      })
      .returning();
    return toContract(row);
  }

  async findById(orgId: string, id: string): Promise<Contract | null> {
    const [row] = await db()
      .select()
      .from(contracts)
      .where(and(eq(contracts.orgId, orgId), eq(contracts.id, id)))
      .limit(1);
    return row ? toContract(row) : null;
  }

  async list(orgId: string): Promise<Contract[]> {
    const rows = await db()
      .select()
      .from(contracts)
      .where(eq(contracts.orgId, orgId))
      .orderBy(asc(contracts.createdAt));
    return rows.map(toContract);
  }

  async setStatus(orgId: string, id: string, status: ContractStatus): Promise<void> {
    await db()
      .update(contracts)
      .set({ status })
      .where(and(eq(contracts.orgId, orgId), eq(contracts.id, id)));
  }

  async setPageCount(orgId: string, id: string, pageCount: number): Promise<void> {
    await db()
      .update(contracts)
      .set({ pageCount })
      .where(and(eq(contracts.orgId, orgId), eq(contracts.id, id)));
  }
}

export class DrizzleDocumentNodeRepo implements DocumentNodeRepo {
  async saveTree(contractId: string, parsed: ParsedDocument): Promise<void> {
    // Assign final IDs up front so parent/cross-ref resolution is pure in-memory.
    const idByKey = new Map<string, string>();
    for (const n of parsed.nodes) idByKey.set(n.localKey, randomUUID());

    const idByNumberLabel = new Map<string, string>();
    for (const n of parsed.nodes) {
      if (n.numberLabel) idByNumberLabel.set(n.numberLabel, idByKey.get(n.localKey)!);
    }

    const nodeRows = parsed.nodes.map((n) => ({
      id: idByKey.get(n.localKey)!,
      contractId,
      parentId: n.parentKey ? (idByKey.get(n.parentKey) ?? null) : null,
      orderIndex: n.orderIndex,
      nodeType: n.nodeType,
      numberLabel: n.numberLabel,
      heading: n.heading,
      text: n.text,
      pageStart: n.pageStart,
      pageEnd: n.pageEnd,
      charStart: n.charStart,
      charEnd: n.charEnd,
    }));

    const refRows = parsed.crossReferences.map((c) => ({
      contractId,
      fromNodeId: idByKey.get(c.fromKey)!,
      toNodeId: idByNumberLabel.get(c.targetNumberLabel) ?? null,
      rawText: c.rawText,
    }));

    await db().transaction(async (tx) => {
      await tx.delete(documentNodes).where(eq(documentNodes.contractId, contractId));
      await tx.delete(crossReferences).where(eq(crossReferences.contractId, contractId));
      if (nodeRows.length) await tx.insert(documentNodes).values(nodeRows);
      if (refRows.length) await tx.insert(crossReferences).values(refRows);
    });
  }

  async listByContract(contractId: string): Promise<DocumentNode[]> {
    return db()
      .select()
      .from(documentNodes)
      .where(eq(documentNodes.contractId, contractId))
      .orderBy(asc(documentNodes.orderIndex)) as Promise<DocumentNode[]>;
  }

  async listCrossReferences(contractId: string): Promise<CrossReference[]> {
    return db()
      .select()
      .from(crossReferences)
      .where(eq(crossReferences.contractId, contractId)) as Promise<CrossReference[]>;
  }
}
