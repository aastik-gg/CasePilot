import { randomUUID } from "node:crypto";
import type {
  AnalysisRepo,
  AssessmentRepo,
  ClauseRepo,
  ContractRepo,
  DocumentNodeRepo,
  MarketStandardRepo,
  NewAnalysis,
  NewClause,
} from "@/domain/ports/repositories";
import type { Contract, ContractStatus, PartyPerspective, RegisterContractInput } from "@/domain/schemas/contract";
import type { CrossReference, DocumentNode, ParsedDocument } from "@/domain/schemas/document";
import type { Clause } from "@/domain/schemas/clause";
import type { Analysis } from "@/domain/schemas/analysis";
import type { ClauseAssessment, Deviation, Severity } from "@/domain/schemas/assessment";
import type { RiskCategory } from "@/domain/schemas/risk";
import type { MarketStandard } from "@/domain/schemas/marketStandard";
import { DEFAULT_MARKET_STANDARDS } from "@/infrastructure/seed/marketStandards";

/** In-memory port implementations so the eval runs the REAL stages + REAL LLM, no cloud infra. */

export class FakeContractRepo implements ContractRepo {
  private store = new Map<string, Contract>();
  seed(c: Contract) {
    this.store.set(c.id, c);
  }
  async create(orgId: string, ownerId: string, input: RegisterContractInput): Promise<Contract> {
    const c: Contract = {
      id: randomUUID(),
      orgId,
      ownerId,
      title: input.title,
      partyPerspective: input.partyPerspective,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      r2Key: input.r2Key,
      pageCount: null,
      status: "uploaded",
      createdAt: new Date(),
    };
    this.store.set(c.id, c);
    return c;
  }
  async findById(orgId: string, id: string) {
    const c = this.store.get(id);
    return c && c.orgId === orgId ? c : null;
  }
  async list(orgId: string) {
    return [...this.store.values()].filter((c) => c.orgId === orgId);
  }
  async setStatus(_o: string, id: string, status: ContractStatus) {
    const c = this.store.get(id);
    if (c) c.status = status;
  }
  async setPageCount(_o: string, id: string, n: number) {
    const c = this.store.get(id);
    if (c) c.pageCount = n;
  }
}

export class FakeDocumentNodeRepo implements DocumentNodeRepo {
  private nodes = new Map<string, DocumentNode[]>();
  async saveTree(contractId: string, parsed: ParsedDocument) {
    // localKey is unique within a parse; use it as the node id (good enough for eval).
    this.nodes.set(
      contractId,
      parsed.nodes.map((n) => ({
        id: n.localKey,
        contractId,
        parentId: n.parentKey,
        orderIndex: n.orderIndex,
        nodeType: n.nodeType,
        numberLabel: n.numberLabel,
        heading: n.heading,
        text: n.text,
        pageStart: n.pageStart,
        pageEnd: n.pageEnd,
        charStart: n.charStart,
        charEnd: n.charEnd,
      })),
    );
  }
  async listByContract(contractId: string) {
    return (this.nodes.get(contractId) ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
  }
  async listCrossReferences(): Promise<CrossReference[]> {
    return [];
  }
}

export class FakeClauseRepo implements ClauseRepo {
  private store = new Map<string, Clause[]>();
  async replaceForContract(contractId: string, items: NewClause[]) {
    this.store.set(
      contractId,
      items.map((c) => ({ ...c, id: randomUUID(), createdAt: new Date() })),
    );
  }
  async listByContract(contractId: string) {
    return this.store.get(contractId) ?? [];
  }
}

export class FakeAssessmentRepo implements AssessmentRepo {
  private store = new Map<string, ClauseAssessment[]>();
  async replaceBenchmark(
    contractId: string,
    items: { clauseId: string; marketStandardId: string | null; deviation: Deviation; rationale: string }[],
  ) {
    this.store.set(
      contractId,
      items.map((i) => ({
        clauseId: i.clauseId,
        contractId,
        marketStandardId: i.marketStandardId,
        deviation: i.deviation,
        rationale: i.rationale,
        riskScore: null,
        severity: null,
        riskCategories: [],
      })),
    );
  }
  async setScores(
    items: { clauseId: string; riskScore: number; severity: Severity; riskCategories: RiskCategory[] }[],
  ) {
    for (const list of this.store.values()) {
      for (const a of list) {
        const m = items.find((i) => i.clauseId === a.clauseId);
        if (m) {
          a.riskScore = m.riskScore;
          a.severity = m.severity;
          a.riskCategories = m.riskCategories;
        }
      }
    }
  }
  async listByContract(contractId: string) {
    return this.store.get(contractId) ?? [];
  }
}

export class FakeAnalysisRepo implements AnalysisRepo {
  private store = new Map<string, Analysis>();
  async save(a: NewAnalysis) {
    this.store.set(a.contractId, { ...a, createdAt: new Date() });
  }
  async getByContract(contractId: string) {
    return this.store.get(contractId) ?? null;
  }
}

/** Returns the static default baseline (no DB) for benchmarking in the eval. */
export class FakeMarketStandardRepo implements MarketStandardRepo {
  async forContract(_orgId: string, perspective: PartyPerspective): Promise<MarketStandard[]> {
    return Object.entries(DEFAULT_MARKET_STANDARDS).map(([type, d]) => ({
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
    }));
  }
  async list(orgId: string) {
    return this.forContract(orgId, "us");
  }
  async upsert(): Promise<MarketStandard> {
    throw new Error("not used in eval");
  }
}
