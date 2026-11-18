"use client";

import { Fragment } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CustomSelect } from "./custom-select";
import { useI18n } from "@/i18n";

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
  className?: string;
  showPageSizeSelector?: boolean;
  showPageNumbers?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  itemLabel,
  className = "",
  showPageSizeSelector = true,
  showPageNumbers = true,
}: PaginationProps) {
  const { t } = useI18n();

  const clampedTotalPages = Math.max(1, totalPages);
  const clampedCurrentPage = Math.min(
    Math.max(1, currentPage),
    clampedTotalPages,
  );

  const start = totalItems > 0 ? (clampedCurrentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(clampedCurrentPage * pageSize, totalItems);

  // Generate numbered pills window
  const getPageNumbers = () => {
    if (clampedTotalPages <= 1) return [];
    return Array.from({ length: clampedTotalPages }, (_, i) => i + 1).filter(
      (p) =>
        p === 1 ||
        p === clampedTotalPages ||
        (p >= clampedCurrentPage - 1 && p <= clampedCurrentPage + 1),
    );
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      aria-label={t("common.pagination")}
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground select-none ${className}`}
    >
      {/* Left section: Item counters and page size selector */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        {totalItems > 0 ? (
          <span className="font-medium text-foreground">
            {t("common.showing")} {start}–{end} {t("common.of")} {totalItems}
            {itemLabel ? ` ${itemLabel}` : ""}
          </span>
        ) : (
          <span>{t("common.noData")}</span>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>{t("common.rows")}</span>
            <CustomSelect
              value={String(pageSize)}
              onChange={(val) => {
                const nextSize = Number(val);
                if (!Number.isNaN(nextSize) && nextSize > 0) {
                  onPageSizeChange(nextSize);
                }
              }}
              options={pageSizeOptions.map((opt) => ({
                value: String(opt),
                label: String(opt),
              }))}
              size="sm"
              direction="up"
              triggerClassName="h-7 px-2 text-xs font-normal rounded-md min-w-[60px]"
            />
          </div>
        )}
      </div>

      {/* Right section: Page status & navigation controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <span className="whitespace-nowrap">
          {t("common.page")} {clampedCurrentPage} {t("common.of")}{" "}
          {clampedTotalPages}
        </span>

        <div className="flex items-center gap-1">
          {/* Previous Page Button */}
          <button
            type="button"
            disabled={clampedCurrentPage <= 1}
            onClick={() => onPageChange(Math.max(1, clampedCurrentPage - 1))}
            className="h-7 w-7 rounded-md border border-input bg-background flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            title={t("common.previous")}
            aria-label={t("common.previous")}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          {/* Numbered Pills (optional for wider viewports) */}
          {showPageNumbers && clampedTotalPages > 1 && (
            <div className="hidden sm:flex items-center gap-1 mx-0.5">
              {pageNumbers.map((p, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <Fragment key={p}>
                    {prev && p - prev > 1 && (
                      <span className="px-1 text-muted-foreground">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onPageChange(p)}
                      aria-current={
                        clampedCurrentPage === p ? "page" : undefined
                      }
                      aria-label={`${t("common.page")} ${p}`}
                      className={`h-7 min-w-[28px] px-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        clampedCurrentPage === p
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  </Fragment>
                );
              })}
            </div>
          )}

          {/* Next Page Button */}
          <button
            type="button"
            disabled={clampedCurrentPage >= clampedTotalPages}
            onClick={() =>
              onPageChange(Math.min(clampedTotalPages, clampedCurrentPage + 1))
            }
            className="h-7 w-7 rounded-md border border-input bg-background flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            title={t("common.next")}
            aria-label={t("common.next")}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
