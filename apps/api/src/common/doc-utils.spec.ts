import { describe, expect, it } from "vitest";
import { fixUtf8String } from "./doc-utils";

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
});
