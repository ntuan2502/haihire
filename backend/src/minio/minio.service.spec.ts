import { describe, expect, it } from "vitest";
import { MinioService } from "./minio.service";

describe("MinioService Security", () => {
  const service = new MinioService();

  describe("extractObjectName", () => {
    it("should extract object name from full HTTP URL", () => {
      const url = "http://localhost:9000/haihire-resumes/resumes/123-candidate.pdf";
      const name = service.extractObjectName(url);
      expect(name).toBe("resumes/123-candidate.pdf");
    });

    it("should extract object name from relative path with bucket name", () => {
      const path = "/haihire-resumes/resumes/my-resume.pdf";
      const name = service.extractObjectName(path);
      expect(name).toBe("resumes/my-resume.pdf");
    });

    it("should return clean path when given direct object name", () => {
      const direct = "resumes/candidate-doc.docx";
      const name = service.extractObjectName(direct);
      expect(name).toBe("resumes/candidate-doc.docx");
    });

    it("should reject path traversal attempts with '..'", () => {
      expect(() => {
        service.extractObjectName("../../etc/passwd");
      }).toThrow("directory traversal not allowed");

      expect(() => {
        service.extractObjectName("resumes/../../../secret.env");
      }).toThrow("directory traversal not allowed");
    });

    it("should handle empty or whitespace inputs gracefully", () => {
      expect(service.extractObjectName("")).toBe("");
      expect(service.extractObjectName("   ")).toBe("");
    });
  });

  describe("uploadFile Tenant Defense", () => {
    const dummyFile = {
      originalname: "resume.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"),
      size: 40,
    } as Express.Multer.File;

    it("should throw AppBadRequestException when tenantOrgId is null", async () => {
      await expect(service.uploadFile(dummyFile, "resumes", null)).rejects.toThrow(
        "Tenant organization ID is required",
      );
    });

    it("should throw AppBadRequestException when tenantOrgId is undefined", async () => {
      await expect(service.uploadFile(dummyFile, "resumes", undefined)).rejects.toThrow(
        "Tenant organization ID is required",
      );
    });

    it("should throw AppBadRequestException when tenantOrgId is empty string", async () => {
      await expect(service.uploadFile(dummyFile, "resumes", "   ")).rejects.toThrow(
        "Tenant organization ID is required",
      );
    });
  });
});
