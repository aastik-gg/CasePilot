import type { ParsedDocument } from "@/domain/schemas/document";

/**
 * Turns raw file bytes into a structured document tree (PRD F1.2–F1.4).
 * Implementations: PDF (layout-aware), DOCX, and an OCR fallback (bonus) — all behind this port.
 */
export interface DocumentParserPort {
  parse(input: { bytes: Uint8Array; mimeType: string }): Promise<ParsedDocument>;
}
