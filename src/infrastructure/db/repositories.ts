import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/infrastructure/db/client";
import {
  analyses,
  clauseAssessments,
  clauseEmbeddings,
  clauses,
  contracts,
  crossReferences,
  documentNodes,
  llmCalls,
  marketStandards,
} from "@/infrastructure/db/schema";
import type {
  AnalysisRepo,
  AssessmentRepo,
  ClauseEmbeddingRepo,
  ClauseRepo,
  ContractRepo,
  DocumentNodeRepo,
  LlmCallRepo,
  MarketStandardRepo,
  NewAnalysis,
  NewClause,
} from "@/domain/ports/repositories";
import type {
  Contract,
  ContractStatus,
  PartyPerspective,
  RegisterContractInput,
} from "@/domain/schemas/contract";
import type { CrossReference, DocumentNode, ParsedDocument } from "@/domain/schemas/document";
import type { Clause, ClauseType } from "@/domain/schemas/clause";
import type { Analysis } from "@/domain/schemas/analysis";
import type { ClauseAssessment, Deviation, Severity } from "@/domain/schemas/assessment";
import type { RiskCategory } from "@/domain/schemas/risk";
import type { MarketStandard, MarketStandardInput } from "@/domain/schemas/marketStandard";
import { DEFAULT_MARKET_STANDARDS } from "@/infrastructure/seed/marketStandards";

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
      overallRiskScore: a.overallRiskScore,
      riskByCategory: a.riskByCategory,
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
      overallRiskScore: r.overallRiskScore,
      riskByCategory: r.riskByCategory as Analysis["riskByCategory"],
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

export class DrizzleAssessmentRepo implements AssessmentRepo {
  async replaceBenchmark(
    contractId: string,
    items: { clauseId: string; marketStandardId: string | null; deviation: Deviation; rationale: string }[],
  ): Promise<void> {
    await db().transaction(async (tx) => {
      await tx.delete(clauseAssessments).where(eq(clauseAssessments.contractId, contractId));
      if (items.length) {
        await tx.insert(clauseAssessments).values(
          items.map((i) => ({
            clauseId: i.clauseId,
            contractId,
            marketStandardId: i.marketStandardId,
            deviation: i.deviation,
            rationale: i.rationale,
            riskCategories: [] as string[],
          })),
        );
      }
    });
  }

  async setScores(
    items: { clauseId: string; riskScore: number; severity: Severity; riskCategories: RiskCategory[] }[],
  ): Promise<void> {
    await db().transaction(async (tx) => {
      for (const i of items) {
        await tx
          .update(clauseAssessments)
          .set({ riskScore: i.riskScore, severity: i.severity, riskCategories: i.riskCategories })
          .where(eq(clauseAssessments.clauseId, i.clauseId));
      }
    });
  }

  async setSuggestions(items: { clauseId: string; suggestedRedline: string }[]): Promise<void> {
    await db().transaction(async (tx) => {
      for (const i of items) {
        await tx
          .update(clauseAssessments)
          .set({ suggestedRedline: i.suggestedRedline })
          .where(eq(clauseAssessments.clauseId, i.clauseId));
      }
    });
  }

  async listByContract(contractId: string): Promise<ClauseAssessment[]> {
    const rows = await db()
      .select()
      .from(clauseAssessments)
      .where(eq(clauseAssessments.contractId, contractId));
    return rows.map((r) => ({
      clauseId: r.clauseId,
      contractId: r.contractId,
      marketStandardId: r.marketStandardId,
      deviation: r.deviation as Deviation,
      rationale: r.rationale,
      riskScore: r.riskScore,
      severity: (r.severity as Severity | null) ?? null,
      riskCategories: r.riskCategories as RiskCategory[],
      suggestedRedline: r.suggestedRedline,
    }));
  }
}

export class DrizzleMarketStandardRepo implements MarketStandardRepo {
  private toMS(r: typeof marketStandards.$inferSelect): MarketStandard {
    return {
      id: r.id,
      orgId: r.orgId,
      clauseType: r.clauseType as MarketStandard["clauseType"],
      perspective: r.perspective as PartyPerspective,
      title: r.title,
      standardPosition: r.standardPosition,
      acceptableRange: r.acceptableRange,
      referenceLanguage: r.referenceLanguage,
      sourceNote: r.sourceNote,
      active: r.active,
    };
  }

  private synthDefaults(perspective: PartyPerspective): Map<string, MarketStandard> {
    const m = new Map<string, MarketStandard>();
    for (const [type, d] of Object.entries(DEFAULT_MARKET_STANDARDS)) {
      m.set(type, {
        id: `default:${type}`,
        orgId: null,
        clauseType: type as MarketStandard["clauseType"],
        perspective,
        title: d.title,
        standardPosition: d.standardPosition,
        acceptableRange: d.acceptableRange,
        referenceLanguage: d.referenceLanguage,
        sourceNote: d.sourceNote,
        active: true,
      });
    }
    return m;
  }

  async forContract(orgId: string, perspective: PartyPerspective): Promise<MarketStandard[]> {
    const rows = await db()
      .select()
      .from(marketStandards)
      .where(
        and(
          eq(marketStandards.perspective, perspective),
          eq(marketStandards.active, true),
          or(eq(marketStandards.orgId, orgId), isNull(marketStandards.orgId)),
        ),
      );
    const byType = this.synthDefaults(perspective);
    // DB globals override static defaults; org-specific override globals.
    for (const r of rows.filter((r) => r.orgId === null)) byType.set(r.clauseType, this.toMS(r));
    for (const r of rows.filter((r) => r.orgId === orgId)) byType.set(r.clauseType, this.toMS(r));
    return [...byType.values()];
  }

  async list(orgId: string): Promise<MarketStandard[]> {
    return this.forContract(orgId, "us");
  }

  async upsert(orgId: string, input: MarketStandardInput): Promise<MarketStandard> {
    return db().transaction(async (tx) => {
      await tx
        .delete(marketStandards)
        .where(
          and(
            eq(marketStandards.orgId, orgId),
            eq(marketStandards.clauseType, input.clauseType),
            eq(marketStandards.perspective, input.perspective),
          ),
        );
      const [row] = await tx
        .insert(marketStandards)
        .values({ orgId, ...input })
        .returning();
      return this.toMS(row);
    });
  }
}

export class DrizzleClauseEmbeddingRepo implements ClauseEmbeddingRepo {
  async replaceForContract(
    contractId: string,
    items: { clauseId: string; clauseType: string; embedding: number[] }[],
  ): Promise<void> {
    await db().transaction(async (tx) => {
      await tx.delete(clauseEmbeddings).where(eq(clauseEmbeddings.contractId, contractId));
      if (items.length) {
        await tx.insert(clauseEmbeddings).values(
          items.map((i) => ({
            clauseId: i.clauseId,
            contractId,
            clauseType: i.clauseType,
            embedding: i.embedding,
          })),
        );
      }
    });
  }

  async nearestInContract(contractId: string, embedding: number[]): Promise<string | null> {
    const literal = `[${embedding.join(",")}]`;
    const [row] = await db()
      .select({ clauseId: clauseEmbeddings.clauseId })
      .from(clauseEmbeddings)
      .where(eq(clauseEmbeddings.contractId, contractId))
      .orderBy(sql`${clauseEmbeddings.embedding} <=> ${literal}::vector`)
      .limit(1);
    return row?.clauseId ?? null;
  }
}
