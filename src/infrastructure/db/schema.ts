import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/**
 * P0 tables (TECH_SPEC §3). Later phases add: clauses, clause_embeddings (pgvector),
 * market_standards, clause_assessments, analyses, llm_calls.
 * Every tenant-owned row carries org_id; repositories filter on it.
 */

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    partyPerspective: text("party_perspective").notNull().default("us"),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    r2Key: text("r2_key").notNull(),
    pageCount: integer("page_count"),
    status: text("status").notNull().default("uploaded"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contracts_org_idx").on(t.orgId)],
);

export const documentNodes = pgTable(
  "document_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    orderIndex: integer("order_index").notNull(),
    nodeType: text("node_type").notNull(),
    numberLabel: text("number_label"),
    heading: text("heading"),
    text: text("text").notNull(),
    pageStart: integer("page_start"),
    pageEnd: integer("page_end"),
    charStart: integer("char_start"),
    charEnd: integer("char_end"),
  },
  (t) => [index("document_nodes_contract_idx").on(t.contractId)],
);

export const crossReferences = pgTable(
  "cross_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    fromNodeId: uuid("from_node_id").notNull(),
    toNodeId: uuid("to_node_id"),
    rawText: text("raw_text").notNull(),
  },
  (t) => [index("cross_references_contract_idx").on(t.contractId)],
);

export const clauses = pgTable(
  "clauses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    clauseType: text("clause_type").notNull(),
    nodeIds: text("node_ids").array().notNull(),
    verbatimText: text("verbatim_text").notNull(),
    confidence: real("confidence").notNull(),
    pageAnchor: integer("page_anchor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clauses_contract_idx").on(t.contractId)],
);

export const analyses = pgTable("analyses", {
  contractId: uuid("contract_id")
    .primaryKey()
    .references(() => contracts.id, { onDelete: "cascade" }),
  overview: text("overview").notNull(),
  whoCarriesRisk: text("who_carries_risk").notNull(),
  keyTerms: jsonb("key_terms").notNull(),
  topIssues: jsonb("top_issues").notNull(),
  overallRiskScore: integer("overall_risk_score").notNull().default(0),
  riskByCategory: jsonb("risk_by_category").notNull(),
  modelVersions: jsonb("model_versions").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketStandards = pgTable(
  "market_standards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id"), // null = global default
    clauseType: text("clause_type").notNull(),
    perspective: text("perspective").notNull(),
    title: text("title").notNull(),
    standardPosition: text("standard_position").notNull(),
    acceptableRange: text("acceptable_range"),
    referenceLanguage: text("reference_language"),
    sourceNote: text("source_note"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("market_standards_org_idx").on(t.orgId)],
);

export const clauseAssessments = pgTable(
  "clause_assessments",
  {
    clauseId: uuid("clause_id")
      .primaryKey()
      .references(() => clauses.id, { onDelete: "cascade" }),
    contractId: uuid("contract_id").notNull(),
    marketStandardId: uuid("market_standard_id"),
    deviation: text("deviation").notNull(),
    rationale: text("rationale").notNull(),
    riskScore: integer("risk_score"),
    severity: text("severity"),
    riskCategories: text("risk_categories").array().notNull(),
    suggestedRedline: text("suggested_redline"),
  },
  (t) => [index("clause_assessments_contract_idx").on(t.contractId)],
);

export const llmCalls = pgTable(
  "llm_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id").notNull(),
    stage: text("stage").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("llm_calls_contract_idx").on(t.contractId)],
);

export const clauseEmbeddings = pgTable(
  "clause_embeddings",
  {
    clauseId: uuid("clause_id")
      .primaryKey()
      .references(() => clauses.id, { onDelete: "cascade" }),
    contractId: uuid("contract_id").notNull(),
    clauseType: text("clause_type").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  },
  (t) => [index("clause_embeddings_contract_idx").on(t.contractId)],
);

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id").notNull(),
    stage: text("stage").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("pipeline_runs_contract_idx").on(t.contractId)],
);
