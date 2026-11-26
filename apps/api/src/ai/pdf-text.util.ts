import type { Readable } from "node:stream";
import { extractText } from "unpdf";

export const DEFAULT_MAX_PDF_BYTES = 6 * 1024 * 1024;
export const DEFAULT_MAX_PDF_CHARS = 12_000;

export async function streamToBuffer(
  stream: Readable,
  maxBytes = DEFAULT_MAX_PDF_BYTES,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw new Error(`PDF stream exceeds max size (${maxBytes} bytes).`);
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks);
}

export interface PdfTextExtractionResult {
  text: string;
  truncated: boolean;
  rawLength: number;
}

export async function extractPdfTextFromBuffer(
  buffer: Buffer,
  maxChars = DEFAULT_MAX_PDF_CHARS,
): Promise<PdfTextExtractionResult> {
  try {
    const result = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });
    const rawText = Array.isArray(result.text)
      ? result.text.join("\n")
      : (result.text ?? "");
    const normalized = rawText
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (normalized.length > maxChars) {
      return {
        text: normalized.slice(0, maxChars),
        truncated: true,
        rawLength: normalized.length,
      };
    }

    return {
      text: normalized,
      truncated: false,
      rawLength: normalized.length,
    };
  } catch {
    return {
      text: "",
      truncated: false,
      rawLength: 0,
    };
  }
}
