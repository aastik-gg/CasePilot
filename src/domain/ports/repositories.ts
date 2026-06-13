import type { Contract, ContractStatus, RegisterContractInput } from "@/domain/schemas/contract";
import type { CrossReference, DocumentNode, ParsedDocument } from "@/domain/schemas/document";
import type { Clause } from "@/domain/schemas/clause";
import type { Analysis } from "@/domain/schemas/analysis";
import type { ClauseAssessment, Deviation, Severity } from "@/domain/schemas/assessment";
import type { RiskCategory } from "@/domain/schemas/risk";
import type { MarketStandard, MarketStandardInput } from "@/domain/schemas/marketStandard";
import type { PartyPerspective } from "@/domain/schemas/contract";
import type { LlmUsage } from "@/domain/ports/llm";

/**
 * Repositories: the domain speaks in aggregates, not SQL (Repository pattern, DIP).
 * Every method is org-scoped — tenant isolation is enforced here, not in routes.
 */

export interface ContractRepo {
  create(orgId: string, ownerId: string, input: RegisterContractInput): Promise<Contract>;
  findById(orgId: string, id: string): Promise<Contract | null>;
  list(orgId: string): Promise<Contract[]>;
  setStatus(orgId: string, id: string, status: ContractStatus): Promise<void>;
  setPageCount(orgId: string, id: string, pageCount: number): Promise<void>;
}

export interface DocumentNodeRepo {
  /** Persists a parsed tree atomically, assigning final IDs and resolving cross-references. */
  saveTree(contractId: string, parsed: ParsedDocument): Promise<void>;
  listByContract(contractId: string): Promise<DocumentNode[]>;
  listCrossReferences(contractId: string): Promise<CrossReference[]>;
}

/** Extracted clauses. `replaceForContract` is idempotent (delete + insert) so a stage can retry. */
export type NewClause = Omit<Clause, "id" | "createdAt">;
export interface ClauseRepo {
  replaceForContract(contractId: string, clauses: NewClause[]): Promise<void>;
  listByContract(contractId: string): Promise<Clause[]>;
}

export type NewAnalysis = Omit<Analysis, "createdAt">;
export interface AnalysisRepo {
  save(analysis: NewAnalysis): Promise<void>;
  getByContract(contractId: string): Promise<Analysis | null>;
}

/** Per-clause assessments: benchmark writes deviation+rationale, score adds risk. */
export interface AssessmentRepo {
  /** Benchmark stage: idempotently set deviation/rationale (clears any prior risk for the contract). */
  replaceBenchmark(
    contractId: string,
    items: { clauseId: string; marketStandardId: string | null; deviation: Deviation; rationale: string }[],
  ): Promise<void>;
  /** Score stage: attach risk to existing assessments by clause ID. */
  setScores(
    items: { clauseId: string; riskScore: number; severity: Severity; riskCategories: RiskCategory[] }[],
  ): Promise<void>;
  /** Suggest stage: attach proposed redline language to existing assessments by clause ID (bonus). */
  setSuggestions(items: { clauseId: string; suggestedRedline: string }[]): Promise<void>;
  listByContract(contractId: string): Promise<ClauseAssessment[]>;
}

/** Market-standard baseline (PRD F3.1). Falls back to the static default when an org has no override. */
export interface MarketStandardRepo {
  /** All active standards applicable to the org for a perspective, keyed by clause type. */
  forContract(orgId: string, perspective: PartyPerspective): Promise<MarketStandard[]>;
  list(orgId: string): Promise<MarketStandard[]>;
  upsert(orgId: string, input: MarketStandardInput): Promise<MarketStandard>;
}

/** Clause embeddings for cross-contract alignment (pgvector). Optional — see EmbeddingPort. */
export interface ClauseEmbeddingRepo {
  replaceForContract(
    contractId: string,
    items: { clauseId: string; clauseType: string; embedding: number[] }[],
  ): Promise<void>;
  /** Clause in `contractId` nearest (cosine) to the query embedding; null if none stored. */
  nearestInContract(contractId: string, embedding: number[]): Promise<string | null>;
}

/** Audit trail for every model call (usage + provenance; no contract text stored — privacy). */
export interface LlmCallRepo {
  log(input: {
    contractId: string;
    stage: string;
    model: string;
    promptVersion: string;
    usage: LlmUsage;
  }): Promise<void>;
}
