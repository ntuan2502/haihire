import type { CandidateDocument } from "@haihire/shared";

/**
 * Normalizes strings and cleans up latin1/UTF-8 encoding anomalies.
 */
export function fixUtf8String(str?: string | null): string {
  if (!str) return "";
  try {
    const fixed = Buffer.from(str, "latin1").toString("utf8");
    if (fixed && !fixed.includes("\ufffd") && fixed !== str) {
      return fixed.normalize("NFC");
    }
  } catch {
    // ignore
  }
  return str.normalize("NFC");
}

export interface DocFallback {
  id: string;
  url: string;
  name: string;
  size?: number | null;
  mimeType?: string | null;
  createdAt?: string | Date;
}

/**
 * Extracts candidate/application documents from serialized notes string,
 * falling back to primary resume fields if no embedded documents are present.
 */
export function extractDocsFromNotes(
  notes: string | null,
  fallback?: DocFallback,
): CandidateDocument[] {
  let docs: CandidateDocument[] = [];
  if (notes) {
    const match = notes.match(/Docs:\s*(\[[^\]]*\])/);
    if (match) {
      try {
        const rawDocs = JSON.parse(match[1]) as Array<Record<string, unknown>>;
        if (Array.isArray(rawDocs)) {
          docs = rawDocs.map((d) => ({
            id: String(d.id || ""),
            name: fixUtf8String(typeof d.name === "string" ? d.name : "document.pdf"),
            url: String(d.url || ""),
            size: typeof d.size === "number" ? d.size : null,
            mimeType: typeof d.mimeType === "string" ? d.mimeType : null,
            type: typeof d.type === "string" ? d.type : undefined,
            createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date().toISOString(),
          }));
        }
      } catch {
        docs = [];
      }
    }
  }

  if (
    docs.length === 0 &&
    fallback &&
    fallback.url &&
    fallback.url.trim() !== ""
  ) {
    docs.push({
      id: `doc-${fallback.id}`,
      name: fixUtf8String(fallback.name || "Resume.pdf"),
      url: fallback.url,
      size: fallback.size,
      mimeType: fallback.mimeType || "application/pdf",
      type: "Resume",
      createdAt: fallback.createdAt
        ? new Date(fallback.createdAt).toISOString()
        : new Date().toISOString(),
    });
  }

  return docs;
}

/**
 * Serializes updated documents array into the candidate/application notes string.
 */
export function packDocsIntoNotes(
  existingNotes: string | null,
  docs: CandidateDocument[],
): string {
  const cleanNotes = (existingNotes || "")
    .replace(/Docs:\s*\[[^\]]*\]\|?/gi, "")
    .trim();

  if (docs.length === 0) {
    return cleanNotes;
  }

  const serializedDocs = JSON.stringify(docs);
  const tag = `Docs: ${serializedDocs}`;

  return cleanNotes ? `${tag} | ${cleanNotes}` : tag;
}
