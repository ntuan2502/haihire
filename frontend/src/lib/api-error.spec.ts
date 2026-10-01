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

  it("translates APPLICATION_STAGE_CONFLICT (HTTP 409) with Vietnamese message", async () => {
    const { vi } = await import("@/i18n/locales/vi");
    const realT = (key: TranslationKey): string => {
      if (key === "errors.APPLICATION_STAGE_CONFLICT") {
        return vi.errors.APPLICATION_STAGE_CONFLICT;
      }
      return key;
    };

    const conflictError = {
      name: "AxiosError",
      message: "Request failed with status code 409",
      response: {
        status: 409,
        data: {
          statusCode: 409,
          code: "APPLICATION_STAGE_CONFLICT",
          message: "Application stage conflict: the application has been modified by another request.",
        },
      },
    };

    const message = getApiErrorMessage(conflictError, realT);
    expect(message).toBe(
      "Hồ sơ ứng viên vừa được cập nhật bởi một người dùng khác. Vui lòng tải lại trang để xem trạng thái mới nhất.",
    );
  });

  it("translates APPLICATION_INVALID_STAGE_TRANSITION (HTTP 400) with Vietnamese message", async () => {
    const { vi } = await import("@/i18n/locales/vi");
    const realT = (key: TranslationKey): string => {
      if (key === "errors.APPLICATION_INVALID_STAGE_TRANSITION") {
        return vi.errors.APPLICATION_INVALID_STAGE_TRANSITION;
      }
      return key;
    };

    const invalidTransitionError = {
      name: "AxiosError",
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          statusCode: 400,
          code: "APPLICATION_INVALID_STAGE_TRANSITION",
          message: "Cannot transition application stage from 'APPLIED' to 'OFFER'.",
        },
      },
    };

    const message = getApiErrorMessage(invalidTransitionError, realT);
    expect(message).toBe(
      "Không thể chuyển hồ sơ sang giai đoạn này. Vui lòng kiểm tra lại quy trình tuyển dụng.",
    );
  });

  it("gatekeeper rejects malformed URLs with [object Object]", async () => {
    const { api } = await import("./api/client");
    await expect(api.get("/test/[object Object]")).rejects.toThrow(
      "[HaiHire API Gatekeeper] Malformed request URL",
    );
  }, 10000);
});
