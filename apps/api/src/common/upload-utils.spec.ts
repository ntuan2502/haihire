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

  it("should reject .docx file since only PDF is permitted", () => {
    const mockFile = {
      originalname: "candidate_cv.docx",
      mimetype:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    } as Express.Multer.File;

    const cb = vi.fn();
    resumeFileFilter({} as Request, mockFile, cb);

    expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    const err = cb.mock.calls[0][0];
    expect(err.message).toContain("Only .pdf format is accepted");
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
    expect(err.message).toContain("Only .pdf format is accepted");
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
      const validPdfBuffer = Buffer.from(
        "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF",
      );
      expect(validateMagicBytes(validPdfBuffer, ".pdf")).toBe(true);
    });

    it("should reject PDF truncated 50% (missing %%EOF trailer)", () => {
      const truncated50 = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj");
      expect(validateMagicBytes(truncated50, ".pdf")).toBe(false);
    });

    it("should reject PDF truncated 99% (only missing %%EOF)", () => {
      const truncated99 = Buffer.from(
        "%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<< /Root 1 0 R >>\n",
      );
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

    it("should reject non-PDF extensions like .docx in validateMagicBytes", () => {
      const validDocxBuffer = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
        Buffer.from("dummy zip payload content"),
        Buffer.from([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00]),
      ]);
      expect(validateMagicBytes(validDocxBuffer, ".docx")).toBe(false);
    });

    it("should reject legacy .doc extension in validateMagicBytes", () => {
      expect(
        validateMagicBytes(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), ".doc"),
      ).toBe(false);
    });

    it("should reject image extensions (.png, .jpg) in validateMagicBytes", () => {
      expect(
        validateMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47]), ".png"),
      ).toBe(false);
      expect(
        validateMagicBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), ".jpg"),
      ).toBe(false);
    });

    it("should reject truncated PDF without %%EOF trailer in validateMagicBytes", () => {
      expect(
        validateMagicBytes(Buffer.from("%PDF-1.4 partial content"), ".pdf"),
      ).toBe(false);
    });

    it("should reject .doc and .png via resumeFileFilter", () => {
      for (const [name, mime] of [
        ["cv.doc", "application/msword"],
        ["avatar.png", "image/png"],
      ]) {
        const cb = vi.fn();
        resumeFileFilter(
          {} as Request,
          { originalname: name, mimetype: mime } as Express.Multer.File,
          cb,
        );
        expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
      }
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

    describe("Cross-Platform Filename Sanitization & Security Edge Cases", () => {
      it("should strip deep Windows backslash path traversal", () => {
        expect(sanitizeFilename("..\\..\\windows\\system32\\boot.ini")).toBe(
          "boot.ini",
        );
      });

      it("should strip Unix forward slash path traversal", () => {
        expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
      });

      it("should strip mixed Windows and Unix path separators", () => {
        expect(sanitizeFilename("..\\../..//boot.ini")).toBe("boot.ini");
      });

      it("should neutralize null bytes and non-printable control characters", () => {
        expect(sanitizeFilename("boot.ini\0.evil")).toBe("boot.ini_.evil");
      });

      it("should sanitize non-ASCII Unicode characters", () => {
        expect(sanitizeFilename("..\\..\\日本語.pdf")).toBe("___.pdf");
      });

      it("should handle very long paths and enforce maximum filename length limit (255 chars)", () => {
        const longPath = "/deep/subfolder/".repeat(50) + "resume.pdf";
        expect(sanitizeFilename(longPath)).toBe("resume.pdf");

        const longName = "a".repeat(1000);
        const result = sanitizeFilename(longName);
        expect(result.length).toBe(255);
        expect(result).toBe("a".repeat(255));
      });

      it("should fallback to 'document' on empty string", () => {
        expect(sanitizeFilename("")).toBe("document");
      });

      it("should fallback to 'document' when input contains only path separators", () => {
        expect(sanitizeFilename("///")).toBe("document");
        expect(sanitizeFilename("\\\\\\")).toBe("document");
        expect(sanitizeFilename("/\\/\\")).toBe("document");
      });

      it("should fallback to 'document' when input consists solely of dots (directory traversal)", () => {
        expect(sanitizeFilename("...")).toBe("document");
        expect(sanitizeFilename("..")).toBe("document");
        expect(sanitizeFilename(".")).toBe("document");
      });
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
        expect((err as AppBadRequestException).code).toBe(
          APP_ERROR_CODES.UPLOAD_TRUNCATED_FILE,
        );
      }
    });

    it("should reject DOCX via validateUploadedFile with VALIDATION_ERROR", () => {
      const docxFile = {
        originalname: "candidate_resume.docx",
        mimetype:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x08, 0x00]),
      } as Express.Multer.File;

      try {
        validateUploadedFile(docxFile);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AppBadRequestException);
        expect((err as AppBadRequestException).code).toBe(
          APP_ERROR_CODES.VALIDATION_ERROR,
        );
        expect((err as AppBadRequestException).message).toContain(
          "Only .pdf format is accepted",
        );
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
