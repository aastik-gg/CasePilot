import type { DocumentParserPort } from "@/domain/ports/parsing";
import type { ParsedDocument } from "@/domain/schemas/document";
import { PdfParser } from "@/infrastructure/parsing/PdfParser";
import { DocxParser } from "@/infrastructure/parsing/DocxParser";
import { ClaudeOcrParser } from "@/infrastructure/parsing/ClaudeOcrParser";
import { StructureBuilder } from "@/infrastructure/parsing/StructureBuilder";

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Below this much extracted text, treat a PDF as scanned (image-only) and fall back to OCR. */
const MIN_TEXT_CHARS = 40;
const nonWhitespaceLength = (pages: string[]) => pages.join("").replace(/\s/g, "").length;

/** Facade: pick the right text extractor by MIME type, OCR-fallback for scans, then build the tree. */
export class DocumentParser implements DocumentParserPort {
  constructor(
    private readonly pdf = new PdfParser(),
    private readonly docx = new DocxParser(),
    private readonly ocr = new ClaudeOcrParser(),
    private readonly structure = new StructureBuilder(),
  ) {}

  async parse({ bytes, mimeType }: { bytes: Uint8Array; mimeType: string }): Promise<ParsedDocument> {
    let pages: string[];
    if (mimeType === PDF) {
      pages = await this.pdf.toPages(bytes);
      if (nonWhitespaceLength(pages) < MIN_TEXT_CHARS) {
        pages = await this.ocr.toPages(bytes); // scanned PDF → OCR via Claude vision (bonus)
      }
    } else if (mimeType === DOCX) {
      pages = await this.docx.toPages(bytes);
    } else {
      throw new Error(`unsupported mime type: ${mimeType}`);
    }
    return this.structure.build(pages);
  }
}
