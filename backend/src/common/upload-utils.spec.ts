import { describe, it, expect, vi } from "vitest";
import { resumeFileFilter } from "./upload-utils";
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
});
