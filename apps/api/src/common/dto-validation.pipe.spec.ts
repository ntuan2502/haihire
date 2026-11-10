import { describe, it, expect } from "vitest";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { z } from "zod";
import { IsString, IsNotEmpty } from "class-validator";
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
          message: string[];
          statusCode: number;
        };
        expect(response.statusCode).toBe(400);
        expect(response.message.some((msg) => msg.includes("title"))).toBe(
          true,
        );
      }
    });
  });
});
