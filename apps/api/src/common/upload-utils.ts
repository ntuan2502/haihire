import { extname } from "node:path";
import { AppBadRequestException } from "./app-exception";
import {
  ALLOWED_ORG_LOGO_EXTENSIONS,
  ALLOWED_ORG_LOGO_MIME_TYPES,
  APP_ERROR_CODES,
  MAX_ORG_LOGO_SIZE_BYTES,
} from "@haihire/shared";
import type { Request } from "express";

export const ALLOWED_RESUME_MIME_TYPES = new Set(["application/pdf"]);

export const ALLOWED_RESUME_EXTENSIONS = new Set([".pdf"]);

export const ALLOWED_LOGO_MIME_TYPES = new Set<string>(
  ALLOWED_ORG_LOGO_MIME_TYPES,
);

export const ALLOWED_LOGO_EXTENSIONS = new Set<string>(
  ALLOWED_ORG_LOGO_EXTENSIONS,
);

const LOGO_EXT_TO_MIME: Record<
  string,
  (typeof ALLOWED_ORG_LOGO_MIME_TYPES)[number]
> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

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

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export function validateImageMagicBytes(buffer: Buffer, ext: string): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const normalizedExt = ext.toLowerCase();

  if (normalizedExt === ".png") {
    if (buffer.length < PNG_MAGIC.length) {
      return false;
    }
    return PNG_MAGIC.every((byte, idx) => buffer[idx] === byte);
  }

  if (normalizedExt === ".jpg" || normalizedExt === ".jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (normalizedExt === ".webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

export function validateUploadedLogoFile(file?: Express.Multer.File | null): {
  ext: string;
  mimeType: (typeof ALLOWED_ORG_LOGO_MIME_TYPES)[number];
} {
  if (!file) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.DOCUMENT_FILE_REQUIRED,
      "Logo file is required.",
    );
  }

  const byteSize = file.size ?? file.buffer?.length ?? 0;
  if (
    byteSize > MAX_ORG_LOGO_SIZE_BYTES ||
    (file.buffer && file.buffer.length > MAX_ORG_LOGO_SIZE_BYTES)
  ) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      "Logo file exceeds the 2 MB maximum size limit.",
    );
  }

  const ext = extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_LOGO_EXTENSIONS.has(ext)) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      `Logo extension '${ext || "none"}' is not permitted. Only PNG, JPG, and WebP are accepted.`,
    );
  }

  const normalizedMime = file.mimetype?.split(";")[0]?.trim().toLowerCase();
  if (normalizedMime && !ALLOWED_LOGO_MIME_TYPES.has(normalizedMime)) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      `Invalid logo MIME type: ${file.mimetype}. Only PNG, JPG, and WebP images are permitted.`,
    );
  }

  const expectedMime = LOGO_EXT_TO_MIME[ext];
  if (normalizedMime && normalizedMime !== expectedMime) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      `Logo MIME type '${normalizedMime}' does not match extension '${ext}'.`,
    );
  }

  if (!file.buffer || !validateImageMagicBytes(file.buffer, ext)) {
    throw new AppBadRequestException(
      APP_ERROR_CODES.VALIDATION_ERROR,
      `Logo content does not match expected binary signature for extension '${ext}'.`,
    );
  }

  return { ext, mimeType: expectedMime };
}

export function logoFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  const ext = extname(file.originalname || "").toLowerCase();

  if (!ALLOWED_LOGO_EXTENSIONS.has(ext)) {
    return callback(
      new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `Logo file type not allowed. Only PNG, JPG, and WebP formats are accepted (received: ${ext || "none"})`,
      ),
      false,
    );
  }

  const normalizedMime = file.mimetype?.split(";")[0]?.trim().toLowerCase();
  if (normalizedMime && !ALLOWED_LOGO_MIME_TYPES.has(normalizedMime)) {
    return callback(
      new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `Invalid logo MIME type: ${file.mimetype}. Only PNG, JPG, and WebP images are permitted.`,
      ),
      false,
    );
  }

  callback(null, true);
}
