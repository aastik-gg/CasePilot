import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
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
