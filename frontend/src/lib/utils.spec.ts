import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  formatFileSize,
  getInitials,
  getCandidateDisplayName,
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
});
