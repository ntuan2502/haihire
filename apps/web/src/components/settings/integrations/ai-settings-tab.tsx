"use client";

import { useEffect, useState } from "react";
import { Brain, KeyRound, Lock } from "lucide-react";
import { LoadingSpinner } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  useAiOverviewQuery,
  useUpdateAiPolicyMutation,
} from "@/hooks/use-ai-setting-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AiConnectionsSection } from "./ai-connections-section";
import { AiRoutingSection } from "./ai-routing-section";

export function AiSettingsTab() {
  const { t } = useI18n();
  const { data: overview, isLoading } = useAiOverviewQuery();
  const updatePolicyMutation = useUpdateAiPolicyMutation();

  const [isEnabled, setIsEnabled] = useState(true);
  const [autoScoreApplications, setAutoScoreApplications] = useState(false);

  useEffect(() => {
    if (!overview) return;
    setIsEnabled(overview.policy.isEnabled);
    setAutoScoreApplications(overview.policy.autoScoreApplications);
  }, [overview]);

  if (isLoading || !overview) {
    return <LoadingSpinner />;
  }

  const activeCount = overview.connections.filter((c) => c.isEnabled).length;
  const totalCount = overview.connections.length;

  const handleToggleMaster = async () => {
    const nextEnabled = !isEnabled;
    setIsEnabled(nextEnabled);
    try {
      await updatePolicyMutation.mutateAsync({
        isEnabled: nextEnabled,
        autoScoreApplications,
        defaultRouteMode: overview.policy.defaultRouteMode,
        defaultRouteTargets: overview.policy.defaultRouteTargets,
      });
      toast.success(t("settings.integrations.ai.policySaved"));
    } catch (err: unknown) {
      setIsEnabled(!nextEnabled);
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  const handleToggleAutoScore = async () => {
    if (!isEnabled) return;
    const nextAutoScore = !autoScoreApplications;
    setAutoScoreApplications(nextAutoScore);
    try {
      await updatePolicyMutation.mutateAsync({
        isEnabled,
        autoScoreApplications: nextAutoScore,
        defaultRouteMode: overview.policy.defaultRouteMode,
        defaultRouteTargets: overview.policy.defaultRouteTargets,
      });
      toast.success(t("settings.integrations.ai.policySaved"));
    } catch (err: unknown) {
      setAutoScoreApplications(!nextAutoScore);
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  const isLocked = !isEnabled;

  return (
    <div className="space-y-5">
      {/* Compact Header Policy Card */}
      <div className="rounded-xl border border-border bg-card p-4 sm:px-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Brain className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                {t("settings.integrations.ai.title")}
              </h2>
              <Badge variant="secondary" className="text-[11px] font-medium">
                {t("settings.integrations.ai.activeConnectionsBadge", {
                  active: activeCount,
                  total: totalCount,
                })}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <span className="text-xs font-medium text-foreground">
              {t("settings.integrations.ai.enabledLabel")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              disabled={updatePolicyMutation.isPending}
              aria-label={t("settings.integrations.ai.enabledLabel")}
              onClick={handleToggleMaster}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer disabled:opacity-50",
                isEnabled ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-xs transition-transform",
                  isEnabled ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>

        {isLocked && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t("settings.integrations.ai.disabledLockNotice")}</span>
          </div>
        )}
      </div>

      {/* Section 1: Multi-API Keys */}
      <AiConnectionsSection
        connections={overview.connections}
        policy={overview.policy}
        routes={overview.routes}
        disabled={isLocked}
      />

      {/* Section 2: Per-feature & Proxy Routing */}
      <AiRoutingSection
        connections={overview.connections}
        policy={overview.policy}
        routes={overview.routes}
        masterEnabled={isEnabled}
        autoScoreApplications={autoScoreApplications}
        onToggleAutoScore={handleToggleAutoScore}
        isUpdatingAutoScore={updatePolicyMutation.isPending}
        disabled={isLocked}
      />

      {/* Security Footer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t("settings.integrations.ai.securityNote")}</span>
      </div>
    </div>
  );
}
