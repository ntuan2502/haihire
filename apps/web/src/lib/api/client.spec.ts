import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadAuthenticatedFile, api } from "./client";

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
