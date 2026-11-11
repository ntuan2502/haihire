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

const EXTENSION_MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/**
 * Resolves a reliable document MIME type from explicit metadata or filename/URL extension.
 */
export function resolveDocumentMimeType(
  explicitMimeType?: string | null,
  fileNameOrUrl?: string | null,
): string | null {
  const normalizedExplicit = explicitMimeType?.split(";")[0]?.trim();
  if (normalizedExplicit && normalizedExplicit !== "application/octet-stream") {
    return normalizedExplicit;
  }

  if (fileNameOrUrl) {
    const cleanPath = fileNameOrUrl.split(/[?#]/)[0]?.toLowerCase() || "";
    for (const [ext, mime] of Object.entries(EXTENSION_MIME_MAP)) {
      if (cleanPath.endsWith(ext)) {
        return mime;
      }
    }
  }

  return normalizedExplicit || null;
}
