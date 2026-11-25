"use client";

import { useState } from "react";
import { LogOut, Monitor, ShieldAlert, Smartphone } from "lucide-react";
import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { ConfirmDestructiveModal } from "@/components/shared/confirm-destructive-modal";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useLocalization } from "@/components/providers/localization-provider";
import { parseUserAgent } from "@/components/settings/audit-log/audit-log-formatters";
import {
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
  useUserSessionsQuery,
} from "@/hooks/use-account-security";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import type { UserSessionRecord } from "@/lib/api/auth";
import { toast } from "@/lib/toast";
import { formatDateTime } from "@/lib/utils";

function isMobileUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}

export function AccountSessionsCard() {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
  } = useUserSessionsQuery();
  const revokeSessionMutation = useRevokeSessionMutation();
  const revokeOthersMutation = useRevokeOtherSessionsMutation();

  const [sessionToRevoke, setSessionToRevoke] =
    useState<UserSessionRecord | null>(null);
  const [confirmRevokeOthersOpen, setConfirmRevokeOthersOpen] = useState(false);

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  const handleRevokeSingle = async () => {
    if (!sessionToRevoke) return;
    try {
      await revokeSessionMutation.mutateAsync(sessionToRevoke.id);
      toast.success(t("settings.accountSecurity.signOutDeviceSuccess"));
      setSessionToRevoke(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const handleRevokeOthers = async () => {
    try {
      const result = await revokeOthersMutation.mutateAsync();
      toast.success(
        t("settings.accountSecurity.revokeOthersSuccess", {
          count: result.revokedCount,
        }),
      );
      setConfirmRevokeOthersOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  return (
    <>
      <SettingsCard className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
              <Monitor className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t("settings.accountSecurity.sessionsTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.accountSecurity.sessionsSubtitle")}
              </p>
            </div>
          </div>

          {otherSessionsCount > 0 && (
            <SettingsButton
              variant="destructive"
              size="sm"
              icon={LogOut}
              onClick={() => setConfirmRevokeOthersOpen(true)}
            >
              {t("settings.accountSecurity.revokeOthersBtn")}
            </SettingsButton>
          )}
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

        {!isLoading && !isError && sessions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t("settings.accountSecurity.sessionsEmpty")}
          </p>
        )}

        {!isLoading && !isError && sessions.length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {sessions.map((session) => {
              const DeviceIcon = isMobileUserAgent(session.userAgent)
                ? Smartphone
                : Monitor;
              const deviceLabel =
                parseUserAgent(session.userAgent) ??
                t("settings.accountSecurity.unknownDevice");
              const ipLabel =
                session.ipAddress || t("settings.accountSecurity.unknownIp");
              const lastActiveLabel = formatDateTime(
                session.lastActiveAt,
                localization,
              );

              return (
                <div
                  key={session.id}
                  data-testid={`session-row-${session.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-card"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-muted/60 border border-border flex items-center justify-center text-muted-foreground shrink-0">
                      <DeviceIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {deviceLabel}
                        </span>
                        {session.isCurrent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            {t("settings.accountSecurity.currentSessionBadge")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {ipLabel} ·{" "}
                        {t("settings.accountSecurity.lastActive", {
                          time: lastActiveLabel,
                        })}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80">
                        {t("settings.accountSecurity.signedInAt", {
                          time: formatDateTime(session.createdAt, localization),
                        })}
                      </p>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <div className="shrink-0">
                      <SettingsButton
                        variant="outline"
                        size="sm"
                        icon={LogOut}
                        onClick={() => setSessionToRevoke(session)}
                      >
                        {t("settings.accountSecurity.signOutDevice")}
                      </SettingsButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading &&
          !isError &&
          sessions.length > 0 &&
          otherSessionsCount === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("settings.accountSecurity.noOtherSessions")}
            </p>
          )}
      </SettingsCard>

      <ConfirmDestructiveModal
        isOpen={Boolean(sessionToRevoke)}
        onClose={() => {
          if (!revokeSessionMutation.isPending) {
            setSessionToRevoke(null);
          }
        }}
        onConfirm={handleRevokeSingle}
        title={t("settings.accountSecurity.signOutDeviceTitle")}
        description={t("settings.accountSecurity.signOutDeviceDesc")}
        confirmButtonLabel={t("settings.accountSecurity.signOutDevice")}
        isLoading={revokeSessionMutation.isPending}
        variant="warning"
      />

      <ConfirmDestructiveModal
        isOpen={confirmRevokeOthersOpen}
        onClose={() => {
          if (!revokeOthersMutation.isPending) {
            setConfirmRevokeOthersOpen(false);
          }
        }}
        onConfirm={handleRevokeOthers}
        title={t("settings.accountSecurity.revokeOthersTitle")}
        description={t("settings.accountSecurity.revokeOthersDesc")}
        confirmButtonLabel={t("settings.accountSecurity.revokeOthersConfirm")}
        isLoading={revokeOthersMutation.isPending}
        variant="danger"
        notice={
          <span className="inline-flex items-center gap-1.5 text-xs">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t("settings.accountSecurity.revokeOthersDesc")}</span>
          </span>
        }
      />
    </>
  );
}
