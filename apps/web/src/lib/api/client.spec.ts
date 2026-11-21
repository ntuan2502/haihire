import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { env } from "../env";
import {
  buildDocumentDownloadPath,
  downloadAuthenticatedFile,
  fetchAuthenticatedDocumentPreview,
  getApiBaseUrl,
  getBrowserApiBaseUrl,
  getDocumentUrl,
  refreshAuthSession,
  resolveOrganizationLogoUrl,
  api,
} from "./client";

describe("resolveOrganizationLogoUrl (client.ts)", () => {
  it("resolves browser-reachable /api prefix for default/localhost settings and never leaks INTERNAL_API_URL", () => {
    const prevInternal = env.INTERNAL_API_URL;
    const prevPublic = env.NEXT_PUBLIC_API_URL;
    try {
      env.INTERNAL_API_URL = "http://internal-api:3001";
      env.NEXT_PUBLIC_API_URL = "http://localhost:13001";

      expect(getApiBaseUrl()).toBe("/api");
      expect(getBrowserApiBaseUrl()).toBe("/api");
      expect(
        resolveOrganizationLogoUrl("/organizations/public/org-1/logo?v=123"),
      ).toBe("/api/organizations/public/org-1/logo?v=123");
    } finally {
      env.INTERNAL_API_URL = prevInternal;
      env.NEXT_PUBLIC_API_URL = prevPublic;
    }
  });

  it("uses external NEXT_PUBLIC_API_URL when configured and handles passthrough or blank values", () => {
    const prevPublic = env.NEXT_PUBLIC_API_URL;
    try {
      env.NEXT_PUBLIC_API_URL = "https://api.example.com/";
      expect(
        resolveOrganizationLogoUrl("/organizations/public/org-1/logo?v=456"),
      ).toBe("https://api.example.com/organizations/public/org-1/logo?v=456");

      expect(
        resolveOrganizationLogoUrl("/api/organizations/public/org-1/logo?v=1"),
      ).toBe("/api/organizations/public/org-1/logo?v=1");
      expect(
        resolveOrganizationLogoUrl("https://cdn.example.com/logo.png"),
      ).toBe("https://cdn.example.com/logo.png");
      expect(resolveOrganizationLogoUrl("blob:http://localhost/1")).toBe(
        "blob:http://localhost/1",
      );
      expect(resolveOrganizationLogoUrl("data:image/png;base64,AAA")).toBe(
        "data:image/png;base64,AAA",
      );
      expect(resolveOrganizationLogoUrl(null)).toBeNull();
      expect(resolveOrganizationLogoUrl("   ")).toBeNull();
    } finally {
      env.NEXT_PUBLIC_API_URL = prevPublic;
    }
  });
});

describe("getDocumentUrl & buildDocumentDownloadPath (client.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty string for empty input", () => {
    expect(getDocumentUrl("")).toBe("");
    expect(buildDocumentDownloadPath({ url: "" })).toBe("");
  });

  it("appends disposition=inline for document download URLs", () => {
    const url =
      "/applications/app-1/documents/download?url=https%3A%2F%2Fminio%2Fcv.pdf";
    const result = getDocumentUrl(url);
    expect(result).toContain("disposition=inline");
    expect(result).toContain("/applications/app-1/documents/download");
  });

  it("routes private MinIO /haihire-resumes/ paths through /applications/:id or /candidates/:id download endpoints", () => {
    const minioUrl =
      "/haihire-resumes/tenants/org-1/resumes/1794402507974-cv.pdf";

    const appPath = buildDocumentDownloadPath({
      url: minioUrl,
      name: "Nguyen Van A.pdf",
      applicationId: "app-123",
      disposition: "inline",
    });
    expect(appPath).toContain("/applications/app-123/documents/download?");
    expect(appPath).toContain("disposition=inline");
    expect(appPath).toContain("name=Nguyen+Van+A.pdf");

    const candPath = buildDocumentDownloadPath({
      url: minioUrl,
      candidateId: "cand-456",
      disposition: "inline",
    });
    expect(candPath).toContain("/candidates/cand-456/documents/download?");
    expect(candPath).toContain("disposition=inline");

    // Never expose raw unauthenticated /haihire-resumes/ without tenant endpoint IDs
    expect(buildDocumentDownloadPath({ url: minioUrl })).toBe("");
    expect(getDocumentUrl(minioUrl)).toBe("");
  });
});

describe("fetchAuthenticatedDocumentPreview (client.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches PDF as authenticated typed Blob URL and classifies kind as pdf", async () => {
    const mockData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: mockData,
      headers: { "content-type": "application/octet-stream" },
    });
    window.URL.createObjectURL = vi
      .fn()
      .mockReturnValue("blob:http://localhost/pdf-blob");

    const res = await fetchAuthenticatedDocumentPreview(
      "/applications/app-1/documents/download?url=cv.pdf&disposition=inline",
      { fileName: "cv.pdf" },
    );

    expect(api.get).toHaveBeenCalledWith(
      "/applications/app-1/documents/download?url=cv.pdf&disposition=inline",
      { responseType: "blob" },
    );
    expect(res).toEqual({
      blobUrl: "blob:http://localhost/pdf-blob",
      mimeType: "application/pdf",
      kind: "pdf",
    });
  });

  it("classifies .docx files as unsupported without creating an iframe blob URL", async () => {
    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: new Uint8Array([0x50, 0x4b]),
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });
    const createObjectURLSpy = vi.fn();
    window.URL.createObjectURL = createObjectURLSpy;

    const res = await fetchAuthenticatedDocumentPreview(
      "/candidates/cand-1/documents/download?url=cv.docx&disposition=inline",
      { fileName: "cv.docx" },
    );

    expect(createObjectURLSpy).not.toHaveBeenCalled();
    expect(res.kind).toBe("unsupported");
    expect(res.blobUrl).toBe("");
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
        {},
        { withCredentials: true },
      );
      expect(replaySpy).toHaveBeenCalled();
    }
  });

  it("does not loop on /auth/login or /auth/refresh 401 errors", async () => {
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

  it("clears server HttpOnly cookies via /auth/logout when refresh fails on 401", async () => {
    localStorage.setItem("haihire_recruiter_user", "{}");

    const postSpy = vi
      .spyOn(axios, "post")
      .mockRejectedValueOnce(new Error("Refresh rejected"))
      .mockResolvedValueOnce({ data: { success: true } });

    const interceptor = (
      api.interceptors.response as unknown as {
        handlers: Array<{ rejected?: (err: unknown) => Promise<unknown> }>;
      }
    ).handlers[0]?.rejected;

    if (interceptor) {
      const apiError = {
        response: { status: 401 },
        config: { url: "/auth/me", headers: {} },
      };

      await expect(interceptor(apiError)).rejects.toThrow("Refresh rejected");
      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining("/auth/refresh"),
        {},
        { withCredentials: true },
      );
      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining("/auth/logout"),
        {},
        { withCredentials: true },
      );
      expect(localStorage.getItem("haihire_recruiter_user")).toBeNull();
    }
  });

  it("clears server HttpOnly cookies when 401 occurs and refresh fails on /auth/onboarding", async () => {
    window.history.pushState({}, "", "/auth/onboarding");
    const postSpy = vi
      .spyOn(axios, "post")
      .mockRejectedValueOnce(new Error("Unauthorized"))
      .mockResolvedValueOnce({ data: { success: true } });

    const interceptor = (
      api.interceptors.response as unknown as {
        handlers: Array<{ rejected?: (err: unknown) => Promise<unknown> }>;
      }
    ).handlers[0]?.rejected;

    if (interceptor) {
      const apiError = {
        response: { status: 401 },
        config: { url: "/auth/me", headers: {} },
      };

      await expect(interceptor(apiError)).rejects.toThrow("Unauthorized");
      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining("/auth/logout"),
        {},
        { withCredentials: true },
      );
    }
  });

  it("deduplicates concurrent refreshAuthSession calls, resolves empty accessToken without hanging, and notifies SSE listeners", async () => {
    const postSpy = vi.spyOn(axios, "post").mockResolvedValueOnce({
      data: { hasOrg: true },
    });
    const refreshedListener = vi.fn();
    window.addEventListener("haihire:auth-refreshed", refreshedListener);

    const [first, second] = await Promise.all([
      refreshAuthSession(),
      refreshAuthSession(),
    ]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(first).toBe("");
    expect(second).toBe("");
    expect(refreshedListener).toHaveBeenCalledTimes(1);

    window.removeEventListener("haihire:auth-refreshed", refreshedListener);
  });
});
