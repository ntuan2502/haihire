import { describe, it, expect } from "vitest";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { z } from "zod";
import { IsString, IsNotEmpty } from "class-validator";
import {
  createInterviewSchema,
  createOrganizationSchema,
  createTrackingLinkSchema,
  SourcingChannel,
} from "@haihire/shared";
import { DtoPipe, ZodValidationPipe } from "./dto-validation.pipe";

class SampleDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

const sampleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  count: z.number().int().positive().optional(),
});

describe("DtoPipe", () => {
  it("returns a ValidationPipe when passed a class constructor", () => {
    const pipe = DtoPipe(SampleDto);
    expect(pipe).toBeInstanceOf(ValidationPipe);
  });

  it("returns a ZodValidationPipe when passed a Zod schema", () => {
    const pipe = DtoPipe(sampleSchema);
    expect(pipe).toBeInstanceOf(ZodValidationPipe);
  });

  describe("ZodValidationPipe", () => {
    const pipe = new ZodValidationPipe(sampleSchema);

    it("successfully parses valid input", () => {
      const validPayload = { title: "Software Engineer", count: 3 };
      const result = pipe.transform(validPayload);
      expect(result).toEqual(validPayload);
    });

    it("throws BadRequestException with descriptive message on validation failure", () => {
      const invalidPayload = { title: "", count: -5 };
      expect(() => pipe.transform(invalidPayload)).toThrow(BadRequestException);

      try {
        pipe.transform(invalidPayload);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const response = (err as BadRequestException).getResponse() as {
          code: string;
          message: string[];
          statusCode: number;
        };
        expect(response.statusCode).toBe(400);
        expect(response.code).toBe("VALIDATION_ERROR");
        expect(response.message.some((msg) => msg.includes("title"))).toBe(
          true,
        );
      }
    });
  });

  describe("Class-validator DtoPipe", () => {
    it("emits VALIDATION_ERROR code alongside constraint messages on invalid DTO payload", async () => {
      const pipe = DtoPipe(SampleDto);
      try {
        await pipe.transform({ title: "" }, { type: "body" });
        expect.unreachable("Expected BadRequestException");
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const response = (err as BadRequestException).getResponse() as {
          code: string;
          message: string[];
          statusCode: number;
        };
        expect(response.statusCode).toBe(400);
        expect(response.code).toBe("VALIDATION_ERROR");
        expect(response.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Shared @haihire/shared Zod schemas via DtoPipe", () => {
    it("validates createInterviewSchema with trimmed fields and ISO datetime", () => {
      const pipe = DtoPipe(createInterviewSchema);
      const parsed = pipe.transform(
        {
          applicationId: "  app-123 ",
          scheduledAt: "2026-11-20T09:00:00Z",
          type: "TECHNICAL",
          interviewer: " Alice Nguyen ",
          round: 2,
        },
        { type: "body" },
      );
      expect(parsed).toMatchObject({
        applicationId: "app-123",
        interviewer: "Alice Nguyen",
        type: "TECHNICAL",
        round: 2,
      });
    });

    it("rejects invalid createTrackingLinkSchema and createOrganizationSchema payloads", () => {
      const linkPipe = DtoPipe(createTrackingLinkSchema);
      expect(() =>
        linkPipe.transform(
          { name: "   ", source: SourcingChannel.LINKEDIN },
          { type: "body" },
        ),
      ).toThrow(BadRequestException);

      const orgPipe = DtoPipe(createOrganizationSchema);
      expect(() =>
        orgPipe.transform(
          { name: "Acme Corp", slug: "Invalid_Slug!" },
          { type: "body" },
        ),
      ).toThrow(BadRequestException);
    });
  });
});
