import { describe, it, expect } from "vitest";
import { getApiErrorMessage } from "./api-error";
import type { TranslationKey } from "@/i18n";

describe("getApiErrorMessage", () => {
  const mockTranslations: Record<string, string> = {
    "errors.ORG_SLUG_ALREADY_EXISTS": "Tổ chức với đường dẫn '{slug}' đã tồn tại.",
    "errors.ORG_NAME_REQUIRED": "Vui lòng nhập tên tổ chức.",
    "errors.generic": "Đã có lỗi xảy ra.",
    "errors.networkError": "Lỗi kết nối mạng.",
  };

  const mockT = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = mockTranslations[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return text;
  };

  it("extracts and translates code from AxiosError response.data correctly", () => {
    // Standard AxiosError structure for HTTP 409
    const axiosError = {
      name: "AxiosError",
      message: "Request failed with status code 409",
      code: "ERR_BAD_REQUEST",
      response: {
        status: 409,
        data: {
          statusCode: 409,
          code: "ORG_SLUG_ALREADY_EXISTS",
          message: "Organization with slug 'admin' already exists.",
          params: { slug: "admin" },
        },
      },
    };

    const message = getApiErrorMessage(axiosError, mockT);
    expect(message).toBe("Tổ chức với đường dẫn 'admin' đã tồn tại.");
  });

  it("handles stringified JSON response.data gracefully", () => {
    const axiosError = {
      message: "Request failed with status code 409",
      response: {
        status: 409,
        data: JSON.stringify({
          code: "ORG_SLUG_ALREADY_EXISTS",
          params: { slug: "workspace" },
        }),
      },
    };

    const message = getApiErrorMessage(axiosError, mockT);
    expect(message).toBe("Tổ chức với đường dẫn 'workspace' đã tồn tại.");
  });

  it("falls back to response.data.message when translation key is not defined", () => {
    const axiosError = {
      name: "AxiosError",
      message: "Request failed with status code 400",
      code: "ERR_BAD_REQUEST",
      response: {
        status: 400,
        data: {
          code: "UNKNOWN_CUSTOM_ERROR",
          message: "Custom backend error message",
        },
      },
    };

    const message = getApiErrorMessage(axiosError, mockT);
    expect(message).toBe("Custom backend error message");
  });

  it("translates direct client-side error descriptors", () => {
    const descriptor = { code: "ORG_NAME_REQUIRED" };
    const message = getApiErrorMessage(descriptor, mockT);
    expect(message).toBe("Vui lòng nhập tên tổ chức.");
  });

  it("handles standard Error instances and network errors", () => {
    expect(getApiErrorMessage(new Error("Network Error"), mockT)).toBe("Lỗi kết nối mạng.");
    expect(getApiErrorMessage(new Error("Random crash"), mockT)).toBe("Random crash");
    expect(getApiErrorMessage("Plain string error", mockT)).toBe("Plain string error");
  });

  it("gatekeeper rejects malformed URLs with [object Object]", async () => {
    const { api } = await import("./api/client");
    await expect(api.get("/test/[object Object]")).rejects.toThrow(
      "[HaiHire API Gatekeeper] Malformed request URL",
    );
  }, 10000);
});
