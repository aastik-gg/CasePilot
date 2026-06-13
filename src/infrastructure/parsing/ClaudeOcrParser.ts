import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

/**
 * OCR fallback for scanned PDFs (PRD bonus). Uses Claude's native PDF/vision support to transcribe
 * an image-only PDF — no Tesseract/canvas, stays on-stack. Haiku 4.5 (cheap, vision-capable).
 */
export class ClaudeOcrParser {
  async toPages(bytes: Uint8Array): Promise<string[]> {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      messages: [
        {
          role: "user",
          content: [
            { type: "file", data: bytes, mediaType: "application/pdf" },
            {
              type: "text",
              text: "Transcribe ALL text from this document exactly as written, preserving section numbers, headings, and order. Output only the transcribed text — no commentary.",
            },
          ],
        },
      ],
    });
    return [text];
  }
}
