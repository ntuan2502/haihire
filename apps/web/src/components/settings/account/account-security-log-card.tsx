"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { SettingsCard } from "@/components/settings/settings-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Pagination } from "@/components/shared/pagination";
import { useLocalization } from "@/components/providers/localization-provider";
import { parseUserAgent } from "@/components/settings/audit-log/audit-log-formatters";
import { useUserSecurityLogsQuery } from "@/hooks/use-account-security";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import type { UserSecurityLogCategory } from "@/lib/api/auth";
import { cn, formatDateTime } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 10;

const CATEGORY_TABS: { value: UserSecurityLogCategory; labelKey: string }[] = [
  { value: "all", labelKey: "settings.accountSecurity.filterAll" },
  { value: "login", labelKey: "settings.accountSecurity.filterAuth" },
  { value: "security", labelKey: "settings.accountSecurity.filterSecurity" },
];

const KNOWN_SECURITY_ACTIONS = new Set([
  "AUTH_LOGIN",
  "AUTH_LOGIN_FAILED",
  "AUTH_LOGOUT",
  "AUTH_PASSWORD_CHANGED",
  "AUTH_SESSION_REVOKED",
  "AUTH_ALL_SESSIONS_REVOKED",
  "ACCOUNT_PROFILE_UPDATED",
]);

export function AccountSecurityLogCard() {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const [category, setCategory] = useState<UserSecurityLogCategory>("all");
  const [page, setPage] = useState(1);

  const offset = (page - 1) * DEFAULT_PAGE_SIZE;
  const { data, isLoading, isError, error } = useUserSecurityLogsQuery({
    category,
    limit: DEFAULT_PAGE_SIZE,
    offset,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;

  const formatActionLabel = (action: string) => {
    if (KNOWN_SECURITY_ACTIONS.has(action)) {
      return t(`settings.accountSecurity.actions.${action}`);
    }
    return action;
  };

  return (
    <SettingsCard className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t("settings.accountSecurity.logsTitle")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("settings.accountSecurity.logsSubtitle")}
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label={t("settings.accountSecurity.logsTitle")}
          className="inline-flex items-center gap-1 rounded-lg bg-muted p-1 shrink-0 self-start sm:self-auto"
        >
          {CATEGORY_TABS.map((tab) => {
            const isActive = category === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setCategory(tab.value);
                  setPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
      {isLoading && <LoadingSpinner />}

      {isError && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium"
        >
          {getApiErrorMessage(error, t)}
        </div>
      )}

      {!isLoading && !isError && logs.length === 0 && (
        <div className="py-8 text-center space-y-1.5">
          <p className="text-xs font-semibold text-foreground">
            {t("settings.accountSecurity.logsEmptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("settings.accountSecurity.logsEmptyDesc")}
          </p>
        </div>
      )}

      {!isLoading && !isError && logs.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {logs.map((entry) => {
              const isFailed = entry.status !== "SUCCESS";
              const clientLabel =
                parseUserAgent(entry.userAgent) ??
                t("settings.accountSecurity.unknownDevice");
              const ipLabel =
                entry.ipAddress || t("settings.accountSecurity.unknownIp");

              return (
                <div
                  key={entry.id}
                  data-testid={`security-log-row-${entry.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-card"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1.5 h-2 w-2 rounded-full shrink-0",
                        isFailed ? "bg-rose-500" : "bg-emerald-500",
                      )}
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {formatActionLabel(entry.action)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                            isFailed
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
                          )}
                        >
                          {isFailed
                            ? t("settings.accountSecurity.statusFailed")
                            : t("settings.accountSecurity.statusSuccess")}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {clientLabel} · {ipLabel}
                      </p>
                    </div>
                  </div>

                  <time
                    dateTime={entry.createdAt}
                    className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0 sm:text-right pl-5 sm:pl-0"
                  >
                    {formatDateTime(entry.createdAt, localization)}
                  </time>
                </div>
              );
            })}
          </div>

          {total > DEFAULT_PAGE_SIZE && (
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))}
              totalItems={total}
              pageSize={DEFAULT_PAGE_SIZE}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          )}
        </div>
      )}
    </SettingsCard>
  );
}
