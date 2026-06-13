import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/infrastructure/db/client";
import {
  analyses,
  clauses,
  contracts,
  crossReferences,
  documentNodes,
  llmCalls,
} from "@/infrastructure/db/schema";
import type {
  AnalysisRepo,
  ClauseRepo,
  ContractRepo,
  DocumentNodeRepo,
  LlmCallRepo,
  NewAnalysis,
  NewClause,
} from "@/domain/ports/repositories";
import type { Contract, ContractStatus, RegisterContractInput } from "@/domain/schemas/contract";
import type { CrossReference, DocumentNode, ParsedDocument } from "@/domain/schemas/document";
import type { Clause, ClauseType } from "@/domain/schemas/clause";
import type { Analysis } from "@/domain/schemas/analysis";

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

export class DrizzleClauseRepo implements ClauseRepo {
  async replaceForContract(contractId: string, items: NewClause[]): Promise<void> {
    await db().transaction(async (tx) => {
      await tx.delete(clauses).where(eq(clauses.contractId, contractId));
      if (items.length) {
        await tx.insert(clauses).values(
          items.map((c) => ({
            contractId,
            clauseType: c.clauseType,
            nodeIds: c.nodeIds,
            verbatimText: c.verbatimText,
            confidence: c.confidence,
            pageAnchor: c.pageAnchor,
          })),
        );
      }
    });
  }

  async listByContract(contractId: string): Promise<Clause[]> {
    const rows = await db()
      .select()
      .from(clauses)
      .where(eq(clauses.contractId, contractId))
      .orderBy(asc(clauses.createdAt));
    return rows.map((r) => ({
      id: r.id,
      contractId: r.contractId,
      clauseType: r.clauseType as ClauseType,
      nodeIds: r.nodeIds,
      verbatimText: r.verbatimText,
      confidence: r.confidence,
      pageAnchor: r.pageAnchor,
      createdAt: r.createdAt,
    }));
  }
}

export class DrizzleAnalysisRepo implements AnalysisRepo {
  async save(a: NewAnalysis): Promise<void> {
    const row = {
      contractId: a.contractId,
      overview: a.overview,
      whoCarriesRisk: a.whoCarriesRisk,
      keyTerms: a.keyTerms,
      topIssues: a.topIssues,
      modelVersions: a.modelVersions,
    };
    await db()
      .insert(analyses)
      .values(row)
      .onConflictDoUpdate({ target: analyses.contractId, set: row });
  }

  async getByContract(contractId: string): Promise<Analysis | null> {
    const [r] = await db()
      .select()
      .from(analyses)
      .where(eq(analyses.contractId, contractId))
      .limit(1);
    if (!r) return null;
    return {
      contractId: r.contractId,
      overview: r.overview,
      whoCarriesRisk: r.whoCarriesRisk,
      keyTerms: r.keyTerms as Analysis["keyTerms"],
      topIssues: r.topIssues as Analysis["topIssues"],
      modelVersions: r.modelVersions as Record<string, string>,
      createdAt: r.createdAt,
    };
  }
}

export class DrizzleLlmCallRepo implements LlmCallRepo {
  async log(input: {
    contractId: string;
    stage: string;
    model: string;
    promptVersion: string;
    usage: { inputTokens: number; outputTokens: number };
  }): Promise<void> {
    await db().insert(llmCalls).values({
      contractId: input.contractId,
      stage: input.stage,
      model: input.model,
      promptVersion: input.promptVersion,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
    });
  }
}
