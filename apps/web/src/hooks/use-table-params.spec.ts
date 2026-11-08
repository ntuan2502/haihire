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
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
    replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
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
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/dashboard/candidates?limit=50");
  });

  it("does not overwrite limit when setLimit and setPage are called sequentially", () => {
    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setLimit(10);
      result.current.setPage(1);
    });

    expect(result.current.limit).toBe(10);
    expect(result.current.page).toBe(1);
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, "", "/dashboard/candidates?limit=10");
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

    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/dashboard/candidates?search=senior+engineer",
    );
    expect(result.current.search).toBe("senior engineer");
    vi.useRealTimers();
  });

  it("preserves trailing spaces in searchInput while debouncing query", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTableParams({ debounceMs: 100 }));

    // User enters search string with a trailing space
    act(() => {
      result.current.setSearchInput("Đức ");
    });

    expect(result.current.searchInput).toBe("Đức ");

    // Advance timer to trigger debounce
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // The query and URL should receive the trimmed search term
    expect(result.current.search).toBe("Đức");
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/dashboard/candidates?search=%C4%90%E1%BB%A9c");

    // CRITICAL: The search input draft MUST still retain the trailing space for smooth typing!
    expect(result.current.searchInput).toBe("Đức ");

    vi.useRealTimers();
  });
});
