import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSonner = vi.hoisted(() => ({
  success: vi.fn(() => "id-success"),
  error: vi.fn(() => "id-error"),
  info: vi.fn(() => "id-info"),
  warning: vi.fn(() => "id-warning"),
  dismiss: vi.fn(),
  getToasts: vi.fn(
    () => [] as Array<{ id: string | number; dismiss?: boolean }>,
  ),
}));

vi.mock("sonner", () => ({
  toast: mockSonner,
}));

import { toast } from "./toast";

describe("lib/toast wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards success, error, info, and warning calls with normalized ids to sonner", () => {
    expect(toast.success("Saved!", { toastId: "save-1" })).toBe("id-success");
    expect(mockSonner.success).toHaveBeenCalledWith("Saved!", {
      id: "save-1",
    });

    expect(toast.error("Failed")).toBe("id-error");
    expect(mockSonner.error).toHaveBeenCalledWith("Failed", undefined);

    expect(toast.info("Updated")).toBe("id-info");
    expect(mockSonner.info).toHaveBeenCalledWith("Updated", undefined);

    expect(toast.warning("Careful")).toBe("id-warning");
    expect(mockSonner.warning).toHaveBeenCalledWith("Careful", undefined);
  });

  it("forwards dismiss and checks active toasts cleanly", () => {
    toast.dismiss("toast-1");
    expect(mockSonner.dismiss).toHaveBeenCalledWith("toast-1");

    mockSonner.getToasts.mockReturnValueOnce([{ id: "toast-1" }]);
    expect(toast.isActive("toast-1")).toBe(true);
    expect(toast.isActive("toast-missing")).toBe(false);
  });
});
