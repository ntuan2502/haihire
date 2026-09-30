import { extname } from "node:path";
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
