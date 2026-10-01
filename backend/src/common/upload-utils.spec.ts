import { describe, it, expect, vi } from "vitest";
import {
  resumeFileFilter,
  validateMagicBytes,
  sanitizeFilename,
  validateUploadedFile,
} from "./upload-utils";
import type { Request } from "express";

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
    it("should accept valid PDF binary signature %PDF-", () => {
      const validPdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj");
      expect(validateMagicBytes(validPdfBuffer, ".pdf")).toBe(true);
    });

    it("should reject fake PDF with text/bash content", () => {
      const fakePdfBuffer = Buffer.from("#!/bin/bash\necho 'Hacked'");
      expect(validateMagicBytes(fakePdfBuffer, ".pdf")).toBe(false);
    });

    it("should accept valid DOCX zip signature PK\\x03\\x04", () => {
      const validDocxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
      expect(validateMagicBytes(validDocxBuffer, ".docx")).toBe(true);
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

    it("should accept legitimate PDF via validateUploadedFile", () => {
      const goodFile = {
        originalname: "real_resume.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 Real Candidate Resume Content"),
      } as Express.Multer.File;

      expect(() => validateUploadedFile(goodFile)).not.toThrow();
    });
  });
});
