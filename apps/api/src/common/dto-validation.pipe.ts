import {
  BadRequestException,
  ValidationPipe,
  type ArgumentMetadata,
  type PipeTransform,
  type Type,
} from "@nestjs/common";
import type { ZodType } from "zod";

export class ZodValidationPipe<T = unknown> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown, _metadata?: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues = result.error.issues || (result.error as { errors?: Array<{ path: (string | number)[]; message: string }> }).errors || [];
      const messages = issues.map((err) => {
        const path = err.path.join(".");
        return path ? `${path}: ${err.message}` : err.message;
      });
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: messages,
      });
    }
    return result.data;
  }
}

function isZodSchema(target: unknown): target is ZodType<unknown> {
  return (
    target !== null &&
    typeof target === "object" &&
    typeof (target as { safeParse?: unknown }).safeParse === "function"
  );
}

/**
 * Creates a validation pipe that explicitly preserves and enforces either:
 * 1. DTO metatype with class-validator (immune to bundler decorator metadata stripping), or
 * 2. Centralized Zod schema from @haihire/shared (zero reflection/metadata dependency).
 */
export function DtoPipe<T>(
  expectedTypeOrSchema: Type<T> | ZodType<T>,
): PipeTransform {
  if (isZodSchema(expectedTypeOrSchema)) {
    return new ZodValidationPipe(expectedTypeOrSchema);
  }
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    expectedType: expectedTypeOrSchema,
  });
}
