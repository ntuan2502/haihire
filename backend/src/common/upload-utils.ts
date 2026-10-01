import { extname, basename } from "node:path";
import { AppBadRequestException } from "./app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import type { Request } from "express";

export const ALLOWED_RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream", // Fallback for some OS/browser uploads of docx
]);

export const ALLOWED_RESUME_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
]);

export function sanitizeFilename(filename: string): string {
  if (!filename) return "document";
  // Remove directory traversal paths, control chars, and illegal characters
  const base = basename(filename).replace(/[/\\?%*:|"<>]/g, "_");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned || "document";
}

export function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const normalizedExt = ext.toLowerCase();

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D) header and %%EOF trailer
  if (normalizedExt === ".pdf") {
    const header = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("binary");
    if (!header.includes("%PDF-")) {
      return false;
    }
    // Trailer check: %%EOF in trailing bytes (traverse backwards up to 2048 bytes)
    const tailStart = Math.max(0, buffer.length - 2048);
    const tail = buffer.subarray(tailStart).toString("binary");
    return tail.includes("%%EOF");
  }

  // 2. DOCX: ZIP archive header PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (normalizedExt === ".docx") {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  // 3. DOC: OLE2 Compound Document (0xD0 0xCF 0x11 0xE0)
  if (normalizedExt === ".doc") {
    return (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    );
  }

  // 4. Images if used for avatars or attachments
  if (normalizedExt === ".png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  if (normalizedExt === ".jpg" || normalizedExt === ".jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
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
      `File extension '${ext}' is not permitted. Only .pdf, .doc, and .docx formats are accepted.`,
    );
  }

  if (file.buffer) {
    if (ext === ".pdf") {
      const header = file.buffer.subarray(0, Math.min(file.buffer.length, 1024)).toString("binary");
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
    } else if (!validateMagicBytes(file.buffer, ext)) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `File content does not match expected binary signature for extension '${ext}'. Malformed or potentially malicious file rejected.`,
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
        `File type not allowed. Only .pdf, .doc, and .docx formats are accepted (received: ${ext || "none"})`,
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
