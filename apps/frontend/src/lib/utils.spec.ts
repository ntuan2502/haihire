import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  formatFileSize,
  formatRelativeTime,
  getInitials,
  getCandidateDisplayName,
  normalizeDateForInput,
  fixUtf8String,
  parseCandidateDocuments,
} from "./utils";

describe("Frontend utils", () => {
  describe("cn (classnames utility)", () => {
    it("merges class names correctly", () => {
      const result = cn("base-class", true && "active", false && "hidden");
      expect(result).toContain("base-class");
      expect(result).toContain("active");
      expect(result).not.toContain("hidden");
    });
  });

  describe("formatDate", () => {
    it("returns dash for null or undefined", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
    });

    it("formats valid date string with numeric style", () => {
      const date = new Date(2026, 7, 27); // Aug 27 2026
      const result = formatDate(date, "numeric");
      expect(result).toBe("08/27/2026");
    });

    it("formats valid date string with short style", () => {
      const date = new Date(2026, 7, 27);
      const result = formatDate(date, "short");
      expect(result).toBe("8/27/2026");
    });
  });

  describe("formatFileSize", () => {
    it("formats 0 bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(null)).toBe("0 B");
    });

    it("formats kilobytes and megabytes", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
    });
  });

  describe("getInitials", () => {
    it("returns dash for null or empty string", () => {
      expect(getInitials(null)).toBe("—");
      expect(getInitials("")).toBe("—");
    });

    it("extracts two initials from full name", () => {
      expect(getInitials("John Doe")).toBe("JD");
      expect(getInitials("Nguyen Van A")).toBe("NA");
    });

    it("handles single name", () => {
      expect(getInitials("Alice")).toBe("AL");
    });
  });

  describe("getCandidateDisplayName", () => {
    it("prioritizes firstName and lastName", () => {
      const candidate = {
        firstName: "Alice",
        lastName: "Smith",
      };
      expect(getCandidateDisplayName(candidate)).toBe("Alice Smith");
    });

    it("falls back to candidateName if present", () => {
      const candidate = {
        candidateName: "Bob Jones",
      };
      expect(getCandidateDisplayName(candidate)).toBe("Bob Jones");
    });

    it("returns dash if null or empty", () => {
      expect(getCandidateDisplayName(null)).toBe("—");
      expect(getCandidateDisplayName({})).toBe("—");
    });
  });

  describe("formatRelativeTime", () => {
    it("returns dash for null or undefined", () => {
      expect(formatRelativeTime(null)).toBe("—");
      expect(formatRelativeTime(undefined)).toBe("—");
    });

    it("returns Just now for current timestamp", () => {
      expect(formatRelativeTime(new Date())).toBe("Just now");
    });

    it("returns minutes ago for dates within the hour", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
    });

    it("returns hours ago for dates within the day", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
      expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
    });
  });

  describe("normalizeDateForInput", () => {
    it("handles empty or dash inputs", () => {
      expect(normalizeDateForInput(null)).toBe("");
      expect(normalizeDateForInput("—")).toBe("");
      expect(normalizeDateForInput("")).toBe("");
    });

    it("returns already formatted YYYY-MM-DD", () => {
      expect(normalizeDateForInput("2026-08-27")).toBe("2026-08-27");
    });

    it("normalizes MM/DD/YYYY format", () => {
      expect(normalizeDateForInput("08/27/2026")).toBe("2026-08-27");
    });
  });

  describe("fixUtf8String", () => {
    it("handles null or empty strings", () => {
      expect(fixUtf8String(null)).toBe("");
      expect(fixUtf8String("")).toBe("");
    });

    it("preserves already clean UTF-8 text", () => {
      expect(fixUtf8String("Nguyễn Văn A")).toBe("Nguyễn Văn A");
    });
  });

  describe("parseCandidateDocuments", () => {
    it("returns empty array when fallback has no resumeUrl", () => {
      expect(parseCandidateDocuments("some notes", undefined)).toEqual([]);
    });

    it("returns formatted document when fallbackApp provides resumeUrl", () => {
      const docs = parseCandidateDocuments("notes", {
        id: "app-1",
        resumeUrl: "/uploads/resume.pdf",
        resumeFileName: "My_Resume.pdf",
        resumeFileSize: 1024,
        resumeMimeType: "application/pdf",
        createdAt: "2026-09-28T00:00:00.000Z",
      });
      expect(docs.length).toBe(1);
      expect(docs[0].id).toBe("app-1");
      expect(docs[0].url).toBe("/uploads/resume.pdf");
      expect(docs[0].name).toBe("My_Resume.pdf");
    });
  });
});
