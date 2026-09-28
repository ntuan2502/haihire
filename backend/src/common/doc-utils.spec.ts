import { describe, expect, it } from "vitest";
import {
  extractDocsFromNotes,
  fixUtf8String,
  packDocsIntoNotes,
} from "./doc-utils";

describe("doc-utils", () => {
  describe("fixUtf8String", () => {
    it("should return empty string for null or undefined", () => {
      expect(fixUtf8String(null)).toBe("");
      expect(fixUtf8String(undefined)).toBe("");
      expect(fixUtf8String("")).toBe("");
    });

    it("should keep normal valid strings untouched", () => {
      expect(fixUtf8String("Nguyen Van A")).toBe("Nguyen Van A");
      expect(fixUtf8String("Senior Software Engineer")).toBe(
        "Senior Software Engineer",
      );
    });

    it("should fix latin1 mangled UTF-8 characters", () => {
      const mangled = Buffer.from("Hồ Chí Minh", "utf8").toString("latin1");
      expect(fixUtf8String(mangled)).toBe("Hồ Chí Minh");
    });
  });

  describe("packDocsIntoNotes & extractDocsFromNotes", () => {
    it("should pack and extract documents cleanly round-trip", () => {
      const sampleDocs = [
        {
          id: "doc-1",
          name: "Resume.pdf",
          url: "resumes/abc.pdf",
          size: 1024,
          mimeType: "application/pdf",
          type: "Resume",
          createdAt: new Date().toISOString(),
        },
      ];

      const packed = packDocsIntoNotes("Good candidate for Frontend", sampleDocs);
      expect(packed).toContain("Docs: [");
      expect(packed).toContain("Good candidate for Frontend");

      const extracted = extractDocsFromNotes(packed);
      expect(extracted.length).toBe(1);
      expect(extracted[0].id).toBe("doc-1");
      expect(extracted[0].url).toBe("resumes/abc.pdf");
    });

    it("should fall back to primary resume if no embedded docs exist", () => {
      const fallback = {
        id: "cand-1",
        url: "resumes/fallback.pdf",
        name: "CV.pdf",
        size: 2048,
        mimeType: "application/pdf",
      };

      const extracted = extractDocsFromNotes("Interviewed by team", fallback);
      expect(extracted.length).toBe(1);
      expect(extracted[0].url).toBe("resumes/fallback.pdf");
      expect(extracted[0].name).toBe("CV.pdf");
    });

    it("should handle empty or malformed notes gracefully", () => {
      expect(extractDocsFromNotes(null)).toEqual([]);
      expect(extractDocsFromNotes("Docs: [invalid-json")).toEqual([]);
    });
  });
});
