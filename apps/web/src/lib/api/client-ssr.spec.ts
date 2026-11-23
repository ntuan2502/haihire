// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

describe("resolveOrganizationLogoUrl SSR (client-ssr.spec.ts)", () => {
  it("never leaks INTERNAL_API_URL when typeof window === 'undefined' during SSR", async () => {
    const prevInternalApiUrl = process.env.INTERNAL_API_URL;
    const prevPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
    try {
      process.env.INTERNAL_API_URL = "http://internal-api:3001";
      process.env.NEXT_PUBLIC_API_URL = "";
      vi.resetModules();

      const ssrClient = await import("./client");

      expect(typeof window).toBe("undefined");
      expect(ssrClient.getApiBaseUrl()).toBe("http://internal-api:3001");
      expect(
        ssrClient.resolveOrganizationLogoUrl(
          "/organizations/public/org-1/logo?v=999",
        ),
      ).toBe("/api/organizations/public/org-1/logo?v=999");
    } finally {
      if (prevInternalApiUrl === undefined) {
        delete process.env.INTERNAL_API_URL;
      } else {
        process.env.INTERNAL_API_URL = prevInternalApiUrl;
      }
      if (prevPublicApiUrl === undefined) {
        delete process.env.NEXT_PUBLIC_API_URL;
      } else {
        process.env.NEXT_PUBLIC_API_URL = prevPublicApiUrl;
      }
      vi.resetModules();
    }
  });
});
