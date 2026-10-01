import { describe, it, expect, vi } from "vitest";
import {
  resumeFileFilter,
  validateMagicBytes,
  sanitizeFilename,
  validateUploadedFile,
} from "./upload-utils";
import type { Request } from "express";
import { APP_ERROR_CODES } from "@haihire/shared";
import { AppBadRequestException } from "./app-exception";

describe("upload-utils resumeFileFilter", () => {
  it("should accept valid PDF file", () => {
    const mockFile = {
      originalname: "my-resume.pdf",
      mimetype: "application/pdf",
    } as Express.Multer.File;

    const cb = vi.fn();
    resumeFileFilter({} as Request, mockFile, cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it("should accept valid docx file", () => {
    const mockFile = {
      originalname: "candidate_cv.docx",
      mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    } as Express.Multer.File;

    const cb = vi.fn();
    resumeFileFilter({} as Request, mockFile, cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it("should reject dangerous executable file (.exe)", () => {
    const mockFile = {
      originalname: "malware.exe",
      mimetype: "application/x-msdownload",
    } as Express.Multer.File;

    const cb = vi.fn();
    resumeFileFilter({} as Request, mockFile, cb);

    expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    const err = cb.mock.calls[0][0];
    expect(err.message).toContain(".pdf, .doc, and .docx formats are accepted");
  });

  it("should reject invalid mime type for pdf extension spoofing", () => {
    const mockFile = {
      originalname: "fake.pdf",
      mimetype: "text/html",
    } as Express.Multer.File;

    const cb = vi.fn();
    resumeFileFilter({} as Request, mockFile, cb);

    expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    const err = cb.mock.calls[0][0];
    expect(err.message).toContain("Invalid file MIME type");
  });

  describe("Magic Bytes & Content Verification", () => {
    it("should accept valid PDF binary signature %PDF- with %%EOF trailer", () => {
      const validPdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");
      expect(validateMagicBytes(validPdfBuffer, ".pdf")).toBe(true);
    });

    it("should reject PDF truncated 50% (missing %%EOF trailer)", () => {
      const truncated50 = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj");
      expect(validateMagicBytes(truncated50, ".pdf")).toBe(false);
    });

    it("should reject PDF truncated 99% (only missing %%EOF)", () => {
      const truncated99 = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<< /Root 1 0 R >>\n");
      expect(validateMagicBytes(truncated99, ".pdf")).toBe(false);
    });

    it("should accept valid PDF where %%EOF is outside last 1024 bytes but within 2048 bytes", () => {
      const validPdfLong = Buffer.concat([
        Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"),
        Buffer.alloc(1200, 0x20), // 1200 bytes of trailing whitespace/metadata
      ]);
      expect(validateMagicBytes(validPdfLong, ".pdf")).toBe(true);
    });

    it("should reject fake PDF with text/bash content", () => {
      const fakePdfBuffer = Buffer.from("#!/bin/bash\necho 'Hacked'");
      expect(validateMagicBytes(fakePdfBuffer, ".pdf")).toBe(false);
    });

    it("should accept valid DOCX with PK\\x03\\x04 header and PK\\x05\\x06 EOCD trailer", () => {
      const validDocxBuffer = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
        Buffer.from("dummy zip payload content"),
        Buffer.from([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00]),
      ]);
      expect(validateMagicBytes(validDocxBuffer, ".docx")).toBe(true);
    });

    it("should reject DOCX truncated 90% (missing EOCD trailer)", () => {
      const truncatedDocx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x08, 0x00]);
      expect(validateMagicBytes(truncatedDocx, ".docx")).toBe(false);
    });

    it("should reject DOCX with header PK\\x03\\x04 but no EOCD", () => {
      const noEocdDocx = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.alloc(1000, 0xaa),
      ]);
      expect(validateMagicBytes(noEocdDocx, ".docx")).toBe(false);
    });

    it("should reject DOCX where EOCD is outside last 65557 bytes", () => {
      const eocdOutside = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from([0x50, 0x4b, 0x05, 0x06]),
        Buffer.alloc(66000, 0x20),
      ]);
      expect(validateMagicBytes(eocdOutside, ".docx")).toBe(false);
    });

    it("should accept DOCX where EOCD is within last 65557 bytes (middle of trailing window)", () => {
      const eocdInsideWindow = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.alloc(10000, 0xaa),
        Buffer.from([0x50, 0x4b, 0x05, 0x06]),
        Buffer.alloc(20000, 0x20),
      ]);
      expect(validateMagicBytes(eocdInsideWindow, ".docx")).toBe(true);
    });

    it("should reject fake DOCX with non-zip content", () => {
      const fakeDocxBuffer = Buffer.from("This is plain text pretending to be docx");
      expect(validateMagicBytes(fakeDocxBuffer, ".docx")).toBe(false);
    });

    it("should sanitize path traversal characters in filename", () => {
      const maliciousName = "../../../../../etc/passwd";
      const sanitized = sanitizeFilename(maliciousName);
      expect(sanitized).not.toContain("/");
      expect(sanitized).not.toContain("..");
      expect(sanitized).toBe("passwd");

      const complexExploit = "..\\..\\boot.ini";
      expect(sanitizeFilename(complexExploit)).toBe("boot.ini");
    });

    it("should reject malicious file via validateUploadedFile", () => {
      const fakeFile = {
        originalname: "fake_resume.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("malicious shell script payload"),
      } as Express.Multer.File;

      expect(() => validateUploadedFile(fakeFile)).toThrow();
    });

    it("should reject truncated PDF via validateUploadedFile with UPLOAD_TRUNCATED_FILE", () => {
      const truncatedFile = {
        originalname: "truncated_resume.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 Incomplete payload without EOF"),
      } as Express.Multer.File;

      try {
        validateUploadedFile(truncatedFile);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AppBadRequestException);
        expect((err as AppBadRequestException).code).toBe(APP_ERROR_CODES.UPLOAD_TRUNCATED_FILE);
      }
    });

    it("should reject truncated DOCX via validateUploadedFile with UPLOAD_TRUNCATED_FILE", () => {
      const truncatedDocxFile = {
        originalname: "truncated_resume.docx",
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x08, 0x00]),
      } as Express.Multer.File;

      try {
        validateUploadedFile(truncatedDocxFile);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AppBadRequestException);
        expect((err as AppBadRequestException).code).toBe(APP_ERROR_CODES.UPLOAD_TRUNCATED_FILE);
        expect((err as AppBadRequestException).message).toContain("DOCX file appears truncated or corrupt");
      }
    });

    it("should accept legitimate PDF via validateUploadedFile", () => {
      const goodFile = {
        originalname: "real_resume.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 Real Candidate Resume Content\n%%EOF"),
      } as Express.Multer.File;

      expect(() => validateUploadedFile(goodFile)).not.toThrow();
    });
  });
});
