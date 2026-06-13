import mammoth from "mammoth";

/**
 * Extracts text from a DOCX. Word documents have no fixed pages, so the whole document is
 * returned as a single "page"; the StructureBuilder derives hierarchy from numbering.
 */
export class DocxParser {
  async toPages(bytes: Uint8Array): Promise<string[]> {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return [value];
  }
}
