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
