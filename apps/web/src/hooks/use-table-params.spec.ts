import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableParams } from "./use-table-params";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/candidates",
  useSearchParams: () => mockSearchParams,
}));

describe("useTableParams hook", () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
    replaceStateSpy = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});
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
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/candidates?limit=50",
    );
  });

  it("does not overwrite limit when setLimit and setPage are called sequentially", () => {
    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setLimit(10);
      result.current.setPage(1);
    });

    expect(result.current.limit).toBe(10);
    expect(result.current.page).toBe(1);
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      "/candidates?limit=10",
    );
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
      "/candidates?search=senior+engineer",
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
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/candidates?search=%C4%90%E1%BB%A9c",
    );

    // CRITICAL: The search input draft MUST still retain the trailing space for smooth typing!
    expect(result.current.searchInput).toBe("Đức ");

    vi.useRealTimers();
  });

  it("strips table-only params and re-renders getParam when switching to calendar", () => {
    mockSearchParams = new URLSearchParams(
      "viewMode=table&tab=UPCOMING&sortBy=upcoming&page=3&limit=50&jobId=job-1&search=an",
    );
    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setParams(
        { viewMode: "calendar", tab: null, sortBy: null, limit: null },
        true,
      );
    });

    expect(result.current.getParam("viewMode")).toBe("calendar");
    expect(result.current.getParam("tab")).toBe("");
    expect(result.current.getParam("sortBy")).toBe("");
    expect(result.current.getParam("jobId")).toBe("job-1");
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/candidates?viewMode=calendar&jobId=job-1&search=an",
    );
  });

  it("does not wipe shallow params when useSearchParams returns a new instance with the same query string", () => {
    const baseQuery = "filter=WITH_RESUME";
    mockSearchParams = {
      toString: () => baseQuery,
      get: (k: string) => new URLSearchParams(baseQuery).get(k),
    } as unknown as URLSearchParams;

    const { result, rerender } = renderHook(() => useTableParams());
    expect(result.current.getParam("filter")).toBe("WITH_RESUME");

    act(() => {
      result.current.setPage(2);
      result.current.setParams({ filter: null }, false);
    });
    expect(result.current.getParam("filter")).toBe("");
    expect(result.current.page).toBe(2);

    // Simulate a parent re-render returning a new URLSearchParams object with unchanged query string
    mockSearchParams = new URLSearchParams(baseQuery);
    rerender();

    expect(result.current.getParam("filter")).toBe("");
    expect(result.current.page).toBe(2);
  });

  it("does not invoke replaceState when setParams is a no-op", () => {
    mockSearchParams = new URLSearchParams("jobId=job-1");
    const { result } = renderHook(() => useTableParams());
    replaceStateSpy.mockClear();

    act(() => {
      result.current.setParams({ jobId: "job-1" }, true);
    });

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
