import type { Contract, ContractStatus, RegisterContractInput } from "@/domain/schemas/contract";
import type { CrossReference, DocumentNode, ParsedDocument } from "@/domain/schemas/document";

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
