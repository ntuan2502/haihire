import type { Provider } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Resolves ThrottlerGuard's Reflector parameter token to bridge CJS/ESM dual-package
 * metadata differences when running under tsx/esbuild without full SWC compilation.
 */
export function createThrottlerReflectorProviders(): Provider[] {
  const throttlerParamTypes =
    (Reflect.getMetadata("design:paramtypes", ThrottlerGuard) as
      (new (...args: unknown[]) => unknown)[] | undefined) || [];
  const throttlerReflectorToken = throttlerParamTypes[2] || Reflector;
  if (throttlerReflectorToken === Reflector) {
    return [];
  }
  return [{ provide: throttlerReflectorToken, useExisting: Reflector }];
}
