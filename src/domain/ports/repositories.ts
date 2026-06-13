import type { Contract, ContractStatus, RegisterContractInput } from "@/domain/schemas/contract";
import type { CrossReference, DocumentNode, ParsedDocument } from "@/domain/schemas/document";
import type { Clause } from "@/domain/schemas/clause";
import type { Analysis } from "@/domain/schemas/analysis";
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
