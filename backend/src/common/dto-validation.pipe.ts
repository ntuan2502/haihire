import { ValidationPipe, type Type } from "@nestjs/common";

/**
 * Creates a ValidationPipe that explicitly preserves and enforces the DTO metatype,
 * guaranteeing class-validator rules execute even under bundlers that strip decorator
 * parameter metadata (esbuild/swc).
 */
export function DtoPipe<T>(expectedType: Type<T>): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    expectedType,
  });
}
