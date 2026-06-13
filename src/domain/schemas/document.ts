import { z } from "zod";

/** The structured contract tree. Preserves hierarchy, numbering, and cross-references (PRD F1.2). */

export const NodeType = z.enum(["section", "subsection", "clause", "paragraph"]);
export type NodeType = z.infer<typeof NodeType>;

export const DocumentNodeSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  parentId: z.string().nullable(),
  orderIndex: z.number().int().nonnegative(),
  nodeType: NodeType,
  numberLabel: z.string().nullable(), // e.g. "7.2.1"
  heading: z.string().nullable(),
  text: z.string(),
  pageStart: z.number().int().nullable(),
  pageEnd: z.number().int().nullable(),
  charStart: z.number().int().nullable(),
  charEnd: z.number().int().nullable(),
});
export type DocumentNode = z.infer<typeof DocumentNodeSchema>;

export const CrossReferenceSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  fromNodeId: z.string(),
  toNodeId: z.string().nullable(), // null until resolved
  rawText: z.string(), // e.g. "as defined in Section 7.2"
});
export type CrossReference = z.infer<typeof CrossReferenceSchema>;

/**
 * Output of the parsing stage, before persistence. The StructureBuilder produces this;
 * the repository assigns final IDs. Nodes reference parents by a parser-local key.
 */
export const ParsedNode = z.object({
  localKey: z.string(),
  parentKey: z.string().nullable(),
  orderIndex: z.number().int().nonnegative(),
  nodeType: NodeType,
  numberLabel: z.string().nullable(),
  heading: z.string().nullable(),
  text: z.string(),
  pageStart: z.number().int().nullable(),
  pageEnd: z.number().int().nullable(),
  charStart: z.number().int().nullable(),
  charEnd: z.number().int().nullable(),
});
export type ParsedNode = z.infer<typeof ParsedNode>;

export const ParsedDocument = z.object({
  pageCount: z.number().int().nonnegative(),
  nodes: z.array(ParsedNode),
  crossReferences: z.array(
    z.object({ fromKey: z.string(), rawText: z.string(), targetNumberLabel: z.string() }),
  ),
});
export type ParsedDocument = z.infer<typeof ParsedDocument>;
