"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { DEFAULT_PAGE_SIZE } from "@/components/shared/pagination";

export interface UseTableParamsOptions {
  defaultLimit?: number;
  debounceMs?: number;
}

export function useTableParams(options?: UseTableParamsOptions) {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_PAGE_SIZE;
  const debounceMs = options?.debounceMs ?? 250;

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Helper to parse page from searchParams
  const getUrlPage = useCallback((params: URLSearchParams) => {
    const raw = params.get("page");
    const num = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(num) && num > 0 ? num : 1;
  }, []);

  // Helper to parse limit from searchParams
  const getUrlLimit = useCallback(
    (params: URLSearchParams) => {
      const raw = params.get("limit");
      const num = raw ? parseInt(raw, 10) : defaultLimit;
      return Number.isFinite(num) && num > 0 ? num : defaultLimit;
    },
    [defaultLimit],
  );

  // Maintain an in-memory mutable URLSearchParams ref so sequential calls
  // in the same tick / event handler never overwrite each other with stale closures.
  const currentParamsRef = useRef<URLSearchParams>(
    new URLSearchParams(searchParams.toString()),
  );

  // Local state for immediate UI feedback (0ms latency, optimistic)
  const [page, setLocalPage] = useState(() => getUrlPage(searchParams));
  const [limit, setLocalLimit] = useState(() => getUrlLimit(searchParams));
  const [searchParam, setSearchParam] = useState(
    () => searchParams.get("search") || "",
  );
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") || "",
  );

  // Sync in-memory ref and local state when URL changes externally (F5, back/forward)
  const syncFromUrl = useCallback(
    (sourceParams: URLSearchParams) => {
      const fresh = new URLSearchParams(sourceParams.toString());
      currentParamsRef.current = fresh;
      setLocalPage(getUrlPage(fresh));
      setLocalLimit(getUrlLimit(fresh));
      const urlSearch = fresh.get("search") || "";
      setSearchParam(urlSearch);

      // Preserve typing draft (NEVER delete trailing spaces or active edits while user is typing)
      setSearchInput((prevInput) => {
        if (prevInput === urlSearch || prevInput.trim() === urlSearch) {
          return prevInput;
        }
        return urlSearch;
      });
    },
    [getUrlPage, getUrlLimit],
  );

  // Sync when Next.js searchParams change (initial mount, router navigation)
  useEffect(() => {
    syncFromUrl(new URLSearchParams(searchParams.toString()));
  }, [searchParams, syncFromUrl]);

  // Sync on browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        syncFromUrl(new URLSearchParams(window.location.search));
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncFromUrl]);

  // Core URL update function
  const updateUrl = useCallback(
    (
      updates: Record<string, string | number | undefined | null>,
      shouldResetPage = false,
    ) => {
      const current = currentParamsRef.current;

      if (shouldResetPage) {
        current.delete("page");
      }

      for (const [key, val] of Object.entries(updates)) {
        if (val === undefined || val === null || val === "" || val === "ALL") {
          current.delete(key);
        } else if (key === "page" && Number(val) === 1) {
          current.delete("page");
        } else if (key === "limit" && Number(val) === defaultLimit) {
          current.delete("limit");
        } else {
          current.set(key, String(val));
        }
      }

      const queryString = current.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      // Use window.history.replaceState for shallow URL updates without triggering
      // Next.js App Router RSC server fetches or Suspense fallback unmounts that cause
      // inputs to lose focus while typing.
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", targetUrl);
      } else {
        startTransition(() => {
          router.replace(targetUrl, { scroll: false });
        });
      }
    },
    [pathname, router, defaultLimit],
  );

  // Debounce search input to URL & query param state
  useEffect(() => {
    // If the trimmed input already matches the active query, don't trigger URL update
    if (searchInput.trim() === searchParam) return;

    // Instant reset if user clears the input, otherwise debounce
    const delay = searchInput === "" ? 0 : debounceMs;
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      setSearchParam(trimmed);
      setLocalPage(1);
      updateUrl({ search: trimmed || null }, true);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchInput, searchParam, debounceMs, updateUrl]);

  const setPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, newPage);
      setLocalPage(validPage);
      updateUrl({ page: validPage }, false);
    },
    [updateUrl],
  );

  const setLimit = useCallback(
    (newLimit: number) => {
      const validLimit = Math.max(1, newLimit);
      setLocalLimit(validLimit);
      setLocalPage(1);
      updateUrl({ limit: validLimit }, true);
    },
    [updateUrl],
  );

  const setParam = useCallback(
    (
      key: string,
      value: string | number | undefined | null,
      resetPage = true,
    ) => {
      if (resetPage) {
        setLocalPage(1);
      }
      updateUrl({ [key]: value }, resetPage);
    },
    [updateUrl],
  );

  const setParams = useCallback(
    (
      newParams: Record<string, string | number | undefined | null>,
      resetPage = true,
    ) => {
      if (resetPage) {
        setLocalPage(1);
      }
      updateUrl(newParams, resetPage);
    },
    [updateUrl],
  );

  const setSearch = useCallback(
    (newSearch: string) => {
      const trimmed = newSearch.trim();
      setSearchParam(trimmed);
      setSearchInput(newSearch);
      setLocalPage(1);
      updateUrl({ search: trimmed || null }, true);
    },
    [updateUrl],
  );

  const getParam = useCallback(
    (key: string, defaultValue = ""): string => {
      return currentParamsRef.current.get(key) ?? defaultValue;
    },
    [],
  );

  return {
    page,
    limit,
    search: searchParam,
    searchInput,
    setSearchInput,
    setSearch,
    setPage,
    setLimit,
    setParam,
    setParams,
    getParam,
    searchParams,
  };
}
