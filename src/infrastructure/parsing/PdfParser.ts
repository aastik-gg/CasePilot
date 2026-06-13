import { extractText, getDocumentProxy } from "unpdf";

/** Extracts per-page text from a PDF (serverless-friendly, no native deps). */
export class PdfParser {
  async toPages(bytes: Uint8Array): Promise<string[]> {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: false });
    return Array.isArray(text) ? text : [text];
  }
}
