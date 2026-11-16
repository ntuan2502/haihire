import { extname } from "node:path";
import { AppBadRequestException } from "./app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import type { Request } from "express";

export const ALLOWED_RESUME_MIME_TYPES = new Set(["application/pdf"]);

export const ALLOWED_RESUME_EXTENSIONS = new Set([".pdf"]);

/**
 * Sanitize filename to prevent path traversal attacks.
 * Cross-platform: handles both Windows (\) and Unix (/) separators.
 *
 * IMPORTANT: Do NOT use path.basename() — it is platform-dependent and
 * behaves differently on Windows vs Linux CI runners.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return "document";
  // Strip path separators (both Unix "/" and Windows "\") manually without relying on path.basename()
  const base = filename.replace(/^.*[/\\]/, "");
  // Sanitize remaining chars (only allow alphanumeric, dots, underscores, dashes)
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Reject filenames composed exclusively of dots (e.g. ".", "..", "...") or empty
  if (!sanitized || /^\.+$/.test(sanitized)) {
    return "document";
  }
  // Enforce standard filesystem maximum filename length (255 characters)
  return sanitized.length > 255 ? sanitized.slice(0, 255) : sanitized;
}

export function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const normalizedExt = ext.toLowerCase();

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D) header and %%EOF trailer
  if (normalizedExt === ".pdf") {
    const header = buffer
      .subarray(0, Math.min(buffer.length, 1024))
      .toString("binary");
    if (!header.includes("%PDF-")) {
      return false;
    }
    // Trailer check: %%EOF in trailing bytes (traverse backwards up to 2048 bytes)
    const tailStart = Math.max(0, buffer.length - 2048);
    const tail = buffer.subarray(tailStart).toString("binary");
    return tail.includes("%%EOF");
  }

  return false;
}

export function validateUploadedFile(file?: Express.Multer.File | null) {
  if (!file) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.DOCUMENT_FILE_REQUIRED,
      "Upload file is required.",
    );
  }

  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_RESUME_EXTENSIONS.has(ext)) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      `File extension '${ext}' is not permitted. Only .pdf format is accepted.`,
    );
  }

  if (file.buffer) {
    const header = file.buffer
      .subarray(0, Math.min(file.buffer.length, 1024))
      .toString("binary");
    if (!header.includes("%PDF-")) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `File content does not match expected binary signature for extension '${ext}'. Malformed or potentially malicious file rejected.`,
      );
    }
    const tailStart = Math.max(0, file.buffer.length - 2048);
    const tail = file.buffer.subarray(tailStart).toString("binary");
    if (!tail.includes("%%EOF")) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.UPLOAD_TRUNCATED_FILE,
        "PDF file appears truncated or corrupt (missing %%EOF trailer in trailing 2048 bytes).",
      );
    }
  }
}

export function resumeFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  const ext = extname(file.originalname).toLowerCase();

  if (!ALLOWED_RESUME_EXTENSIONS.has(ext)) {
    return callback(
      new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `File type not allowed. Only .pdf format is accepted (received: ${ext || "none"})`,
      ),
      false,
    );
  }

  if (file.mimetype && !ALLOWED_RESUME_MIME_TYPES.has(file.mimetype)) {
    return callback(
      new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `Invalid file MIME type: ${file.mimetype}. Only PDF and Word documents are permitted.`,
      ),
      false,
    );
  }

  callback(null, true);
}
