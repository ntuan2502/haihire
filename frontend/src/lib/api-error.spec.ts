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

  it("translates APPLICATION_INVALID_STAGE_TRANSITION and APPLICATION_STAGE_CONFLICT in English", async () => {
    const { en } = await import("@/i18n/locales/en");
    const enT = (key: TranslationKey): string => {
      if (key === "errors.APPLICATION_INVALID_STAGE_TRANSITION") {
        return en.errors.APPLICATION_INVALID_STAGE_TRANSITION;
      }
      if (key === "errors.APPLICATION_STAGE_CONFLICT") {
        return en.errors.APPLICATION_STAGE_CONFLICT;
      }
      return key;
    };

    const invalidTransitionError = {
      response: {
        status: 400,
        data: {
          code: "APPLICATION_INVALID_STAGE_TRANSITION",
          message: "Cannot transition application stage from 'SCREENING' to 'APPLIED'",
        },
      },
    };

    const conflictError = {
      response: {
        status: 409,
        data: {
          code: "APPLICATION_STAGE_CONFLICT",
          message: "Conflict detected",
        },
      },
    };

    expect(getApiErrorMessage(invalidTransitionError, enT)).toBe(
      "This stage transition is not allowed. Please check the recruitment workflow.",
    );
    expect(getApiErrorMessage(conflictError, enT)).toBe(
      "This application was just updated by another user. Please refresh to see the latest status.",
    );
  });

  it("parses raw JSON string error responses and extracts clean i18n message without leaking JSON dump", async () => {
    const { vi } = await import("@/i18n/locales/vi");
    const realT = (key: TranslationKey): string => {
      if (key === "errors.APPLICATION_INVALID_STAGE_TRANSITION") {
        return vi.errors.APPLICATION_INVALID_STAGE_TRANSITION;
      }
      return key;
    };

    const rawJsonError = {
      response: {
        status: 400,
        data: JSON.stringify({
          statusCode: 400,
          code: "APPLICATION_INVALID_STAGE_TRANSITION",
          message: "Cannot transition application stage from 'SCREENING' to 'APPLIED'",
          params: { currentStage: "SCREENING", targetStage: "APPLIED" },
        }),
      },
    };

    const message = getApiErrorMessage(rawJsonError, realT);
    expect(message).toBe(
      "Không thể chuyển hồ sơ sang giai đoạn này. Vui lòng kiểm tra lại quy trình tuyển dụng.",
    );
    expect(message).not.toContain("{");
    expect(message).not.toContain("APPLICATION_INVALID_STAGE_TRANSITION");
  });


  it("gatekeeper rejects malformed URLs with [object Object]", async () => {
    const { api } = await import("./api/client");
    await expect(api.get("/test/[object Object]")).rejects.toThrow(
      "[HaiHire API Gatekeeper] Malformed request URL",
    );
  }, 10000);

  it("handles newly audited error codes (UPLOAD_TRUNCATED_FILE, TENANT_ID_REQUIRED_FOR_UPLOAD, TRACKING_LINK_NOT_FOUND)", async () => {
    const { vi } = await import("@/i18n/locales/vi");
    const { en } = await import("@/i18n/locales/en");

    const tVi = (k: TranslationKey) => {
      const code = k.replace("errors.", "");
      return (vi.errors as Record<string, string>)[code] || k;
    };
    const tEn = (k: TranslationKey) => {
      const code = k.replace("errors.", "");
      return (en.errors as Record<string, string>)[code] || k;
    };

    const truncatedErr = {
      response: { data: { code: "UPLOAD_TRUNCATED_FILE" } },
    };
    expect(getApiErrorMessage(truncatedErr, tVi)).toBe(vi.errors.UPLOAD_TRUNCATED_FILE);
    expect(getApiErrorMessage(truncatedErr, tEn)).toBe(en.errors.UPLOAD_TRUNCATED_FILE);

    const tenantReqErr = {
      response: { data: { code: "TENANT_ID_REQUIRED_FOR_UPLOAD" } },
    };
    expect(getApiErrorMessage(tenantReqErr, tVi)).toBe(vi.errors.TENANT_ID_REQUIRED_FOR_UPLOAD);
    expect(getApiErrorMessage(tenantReqErr, tEn)).toBe(en.errors.TENANT_ID_REQUIRED_FOR_UPLOAD);

    const trackingLinkErr = {
      response: { data: { code: "TRACKING_LINK_NOT_FOUND" } },
    };
    expect(getApiErrorMessage(trackingLinkErr, tVi)).toBe(vi.errors.TRACKING_LINK_NOT_FOUND);
    expect(getApiErrorMessage(trackingLinkErr, tEn)).toBe(en.errors.TRACKING_LINK_NOT_FOUND);
  });

  it("handles 429 TOO_MANY_REQUESTS status code and code string properly", async () => {
    const { vi } = await import("@/i18n/locales/vi");
    const tVi = (k: TranslationKey) => {
      const code = k.replace("errors.", "");
      return (vi.errors as Record<string, string>)[code] || k;
    };

    // Case A: code "TOO_MANY_REQUESTS" from ThrottlerException
    const throttlerErr = {
      response: {
        status: 429,
        data: {
          statusCode: 429,
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please slow down and try again later.",
        },
      },
    };
    expect(getApiErrorMessage(throttlerErr, tVi)).toBe(vi.errors.TOO_MANY_REQUESTS);

    // Case B: status 429 with no code in body
    const rawStatus429Err = {
      response: {
        status: 429,
      },
    };
    expect(getApiErrorMessage(rawStatus429Err, tVi)).toBe(vi.errors.TOO_MANY_REQUESTS);
  });

  it("handles NestJS ValidationPipe array messages gracefully", () => {
    const validationPipeErr = {
      response: {
        status: 400,
        data: {
          statusCode: 400,
          error: "Bad Request",
          message: ["email must be an email", "password must be longer than 8 characters"],
        },
      },
    };

    const dummyT = (key: TranslationKey) => key;
    expect(getApiErrorMessage(validationPipeErr, dummyT)).toBe(
      "email must be an email; password must be longer than 8 characters",
    );
  });

  it("falls back to status code messages when response body is empty", async () => {
    const { vi } = await import("@/i18n/locales/vi");
    const tVi = (k: TranslationKey) => {
      const code = k.replace("errors.", "");
      return (vi.errors as Record<string, string>)[code] || k;
    };

    expect(getApiErrorMessage({ response: { status: 401 } }, tVi)).toBe(vi.errors.UNAUTHORIZED);
    expect(getApiErrorMessage({ response: { status: 403 } }, tVi)).toBe(vi.errors.FORBIDDEN);
    expect(getApiErrorMessage({ response: { status: 404 } }, tVi)).toBe(vi.errors.RESOURCE_NOT_FOUND);
    expect(getApiErrorMessage({ response: { status: 500 } }, tVi)).toBe(vi.errors.GENERIC_ERROR);
  });

  it("ensures axios client is configured with withCredentials for cookie auth", async () => {
    const { api } = await import("./api/client");
    expect(api.defaults.withCredentials).toBe(true);
  });
});
