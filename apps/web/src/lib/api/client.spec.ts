import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { downloadAuthenticatedFile, getDocumentUrl, api } from "./client";

describe("getDocumentUrl (client.ts)", () => {
  it("returns empty string for empty input", () => {
    expect(getDocumentUrl("")).toBe("");
  });

  it("appends disposition=inline for document download URLs", () => {
    const url =
      "/applications/app-1/documents/download?url=https%3A%2F%2Fminio%2Fcv.pdf";
    const result = getDocumentUrl(url);
    expect(result).toContain("disposition=inline");
    expect(result).toContain("/applications/app-1/documents/download");
  });
});

describe("downloadAuthenticatedFile (client.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully downloads file using blob when api.get resolves", async () => {
    const mockData = new Uint8Array([1, 2, 3]);
    vi.spyOn(api, "get").mockResolvedValueOnce({ data: mockData });

    const createObjectURLSpy = vi
      .fn()
      .mockReturnValue("blob:http://localhost/123");
    const revokeObjectURLSpy = vi.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;

    await expect(
      downloadAuthenticatedFile("/test/path", "test.pdf"),
    ).resolves.toBeUndefined();

    expect(api.get).toHaveBeenCalledWith("/test/path", {
      responseType: "blob",
    });
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(
      "blob:http://localhost/123",
    );
  });

  it("throws error when api.get fails with 401 without swallowing", async () => {
    const authError = new Error("401 Unauthorized");
    vi.spyOn(api, "get").mockRejectedValueOnce(authError);

    await expect(
      downloadAuthenticatedFile("/test/path", "test.pdf"),
    ).rejects.toThrow("401 Unauthorized");
  });
});

describe("Silent Token Refresh Response Interceptor (client.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("attempts to refresh token and retries request on 401 error", async () => {
    localStorage.setItem(
      "haihire_recruiter_refresh_token",
      "valid-refresh-token",
    );

    const postSpy = vi.spyOn(axios, "post").mockResolvedValueOnce({
      data: {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      },
    });

    // Mock the interceptor response error handling
    const interceptor = (
      api.interceptors.response as unknown as {
        handlers: Array<{ rejected?: (err: unknown) => Promise<unknown> }>;
      }
    ).handlers[0]?.rejected;

    expect(interceptor).toBeDefined();

    if (interceptor) {
      const mockConfig = {
        url: "/candidates",
        headers: {},
      };
      const mockError = {
        response: { status: 401 },
        config: mockConfig,
      };

      // Mock replay call
      const replaySpy = vi.spyOn(api, "request").mockResolvedValueOnce({
        data: { success: true },
      } as never);

      await interceptor(mockError);

      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining("/auth/refresh"),
        { refreshToken: "valid-refresh-token" },
        { withCredentials: true },
      );
      expect(localStorage.getItem("haihire_recruiter_token")).toBe(
        "new-access-token",
      );
      expect(localStorage.getItem("haihire_recruiter_refresh_token")).toBe(
        "new-refresh-token",
      );
      expect(replaySpy).toHaveBeenCalled();
    }
  });

  it("does not loop on /auth/login or /auth/refresh 401 errors", async () => {
    localStorage.setItem(
      "haihire_recruiter_refresh_token",
      "valid-refresh-token",
    );
    const postSpy = vi.spyOn(axios, "post");

    const interceptor = (
      api.interceptors.response as unknown as {
        handlers: Array<{ rejected?: (err: unknown) => Promise<unknown> }>;
      }
    ).handlers[0]?.rejected;

    if (interceptor) {
      const loginError = {
        response: { status: 401 },
        config: { url: "/auth/login" },
      };

      await expect(interceptor(loginError)).rejects.toEqual(loginError);
      expect(postSpy).not.toHaveBeenCalled();
    }
  });
});
