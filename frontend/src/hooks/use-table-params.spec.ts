import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableParams } from "./use-table-params";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard/candidates",
  useSearchParams: () => mockSearchParams,
}));

describe("useTableParams hook", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("initializes with default page 1 and default limit 20", () => {
    const { result } = renderHook(() => useTableParams());
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(20);
    expect(result.current.search).toBe("");
  });

  it("updates limit and resets page when setLimit is called", () => {
    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setLimit(50);
    });

    expect(result.current.limit).toBe(50);
    expect(result.current.page).toBe(1);
    expect(mockReplace).toHaveBeenCalledWith("/dashboard/candidates?limit=50", { scroll: false });
  });

  it("does not overwrite limit when setLimit and setPage are called sequentially", () => {
    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setLimit(10);
      result.current.setPage(1);
    });

    expect(result.current.limit).toBe(10);
    expect(result.current.page).toBe(1);
    expect(mockReplace).toHaveBeenLastCalledWith("/dashboard/candidates?limit=10", { scroll: false });
  });

  it("updates search debounced and resets page", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTableParams({ debounceMs: 100 }));

    act(() => {
      result.current.setSearchInput("senior engineer");
    });

    expect(result.current.searchInput).toBe("senior engineer");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockReplace).toHaveBeenCalledWith(
      "/dashboard/candidates?search=senior+engineer",
      { scroll: false },
    );
    vi.useRealTimers();
  });
});
