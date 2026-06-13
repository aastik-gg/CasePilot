import { z } from "zod";

/** Single source of truth: schema defines the shape; the type is `z.infer`. No parallel interfaces. */

export const ContractStatus = z.enum([
  "uploaded",
  "parsing",
  "analyzing",
  "ready",
  "failed",
]);
export type ContractStatus = z.infer<typeof ContractStatus>;

/** Whose side "favourable/unfavourable" is judged from. Default: the uploading customer. */
export const PartyPerspective = z.enum(["us", "counterparty"]);
export type PartyPerspective = z.infer<typeof PartyPerspective>;

export const ContractSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  ownerId: z.string(),
  title: z.string(),
  partyPerspective: PartyPerspective.default("us"),
  originalFilename: z.string(),
  mimeType: z.string(),
  r2Key: z.string(),
  pageCount: z.number().int().nonnegative().nullable(),
  status: ContractStatus,
  createdAt: z.date(),
});
export type Contract = z.infer<typeof ContractSchema>;

/** Payload to register a freshly-uploaded file (before ingestion). */
export const RegisterContractInput = z.object({
  r2Key: z.string().min(1),
  title: z.string().min(1).max(256),
  originalFilename: z.string().min(1),
  mimeType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  partyPerspective: PartyPerspective.default("us"),
});
export type RegisterContractInput = z.infer<typeof RegisterContractInput>;
