import type { DocumentParserPort } from "@/domain/ports/parsing";
import type { ParsedDocument } from "@/domain/schemas/document";
import { PdfParser } from "@/infrastructure/parsing/PdfParser";
import { DocxParser } from "@/infrastructure/parsing/DocxParser";
import { StructureBuilder } from "@/infrastructure/parsing/StructureBuilder";

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Facade: pick the right text extractor by MIME type, then build the structured tree. */
export class DocumentParser implements DocumentParserPort {
  constructor(
    private readonly pdf = new PdfParser(),
    private readonly docx = new DocxParser(),
    private readonly structure = new StructureBuilder(),
  ) {}

  async parse({ bytes, mimeType }: { bytes: Uint8Array; mimeType: string }): Promise<ParsedDocument> {
    let pages: string[];
    if (mimeType === PDF) pages = await this.pdf.toPages(bytes);
    else if (mimeType === DOCX) pages = await this.docx.toPages(bytes);
    else throw new Error(`unsupported mime type: ${mimeType}`);
    return this.structure.build(pages);
  }
}
