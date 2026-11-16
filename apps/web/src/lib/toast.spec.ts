import { describe, it, expect, vi, beforeEach } from "vitest";

const mockToastify = vi.hoisted(() => ({
  success: vi.fn(() => "id-success"),
  error: vi.fn(() => "id-error"),
  info: vi.fn(() => "id-info"),
  warning: vi.fn(() => "id-warning"),
  dismiss: vi.fn(),
  isActive: vi.fn(() => false),
}));

vi.mock("react-toastify", () => ({
  toast: mockToastify,
}));

import { toast } from "./toast";

describe("lib/toast wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards success, error, info, and warning calls with options to react-toastify", () => {
    expect(toast.success("Saved!", { toastId: "save-1" })).toBe("id-success");
    expect(mockToastify.success).toHaveBeenCalledWith("Saved!", {
      toastId: "save-1",
    });

    expect(toast.error("Failed")).toBe("id-error");
    expect(mockToastify.error).toHaveBeenCalledWith("Failed", undefined);

    expect(toast.info("Updated")).toBe("id-info");
    expect(mockToastify.info).toHaveBeenCalledWith("Updated", undefined);

    expect(toast.warning("Careful")).toBe("id-warning");
    expect(mockToastify.warning).toHaveBeenCalledWith("Careful", undefined);
  });

  it("forwards dismiss and isActive helpers", () => {
    toast.dismiss("toast-1");
    expect(mockToastify.dismiss).toHaveBeenCalledWith("toast-1");

    mockToastify.isActive.mockReturnValueOnce(true);
    expect(toast.isActive("toast-1")).toBe(true);
    expect(mockToastify.isActive).toHaveBeenCalledWith("toast-1");
  });
});
