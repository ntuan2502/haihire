"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AI_FEATURE_ROUTE_MODES,
  AI_PROXY_MODES,
  normalizeAiRouteTargets,
  type AiConnectionResponse,
  type AiFeatureKey,
  type AiFeatureRouteMode,
  type AiFeatureRouteResponse,
  type AiPolicyResponse,
  type AiProxyMode,
  type AiRouteTarget,
  type AiRouteTestTarget,
  type TestAiRouteResponse,
} from "@haihire/shared";
import { CheckCircle2, Loader2, PlugZap, Save, XCircle } from "lucide-react";
import { SettingsButton } from "@/components/settings/settings-button";
import { SlideOver } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useTestAiRouteMutation,
  useUpdateAiPolicyMutation,
  useUpdateAiRoutesMutation,
} from "@/hooks/use-ai-setting-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AiRouteTargetPool } from "./ai-route-target-pool";

export interface AiRouteConfigDrawerProps {
  target: AiRouteTestTarget | null;
  connections: AiConnectionResponse[];
  policy: AiPolicyResponse;
  routes: AiFeatureRouteResponse[];
  masterEnabled: boolean;
  autoScoreApplications: boolean;
  onClose: () => void;
}

export function AiRouteConfigDrawer({
  target,
  connections,
  policy,
  routes,
  masterEnabled,
  autoScoreApplications,
  onClose,
}: AiRouteConfigDrawerProps) {
  const { t } = useI18n();
  const updatePolicyMutation = useUpdateAiPolicyMutation();
  const updateRoutesMutation = useUpdateAiRoutesMutation();
  const testRouteMutation = useTestAiRouteMutation();

  const isGlobalDefault = target === "GLOBAL_DEFAULT";

  const savedRoute = useMemo(() => {
    if (!target || isGlobalDefault) return null;
    return (
      routes.find((r) => r.feature === target) ?? {
        feature: target as AiFeatureKey,
        isEnabled: true,
        mode: "INHERIT_DEFAULT" as AiFeatureRouteMode,
        targets: [],
      }
    );
  }, [target, isGlobalDefault, routes]);

  const savedMode: AiFeatureRouteMode = isGlobalDefault
    ? policy.defaultRouteMode
    : (savedRoute?.mode ?? "INHERIT_DEFAULT");

  const savedTargets: AiRouteTarget[] = useMemo(
    () =>
      isGlobalDefault
        ? policy.defaultRouteTargets
        : (savedRoute?.targets ?? []),
    [isGlobalDefault, policy.defaultRouteTargets, savedRoute],
  );

  const [mode, setMode] = useState<AiFeatureRouteMode>(savedMode);
  const [targets, setTargets] = useState<AiRouteTarget[]>(savedTargets);
  const [testResult, setTestResult] = useState<TestAiRouteResponse | null>(
    null,
  );

  useEffect(() => {
    if (!target) return;
    setMode(savedMode);
    setTargets(savedTargets);
    setTestResult(null);
  }, [target, savedMode, savedTargets]);

  const isSaving =
    updatePolicyMutation.isPending || updateRoutesMutation.isPending;
  const isTesting = testRouteMutation.isPending;

  const normalizedDraftTargets = useMemo(() => {
    if (mode === "INHERIT_DEFAULT") return [];
    const normalized = normalizeAiRouteTargets(targets);
    return mode === "SINGLE" ? normalized.slice(0, 1) : normalized;
  }, [mode, targets]);

  const normalizedSavedTargets = useMemo(() => {
    if (savedMode === "INHERIT_DEFAULT") return [];
    const normalized = normalizeAiRouteTargets(savedTargets);
    return savedMode === "SINGLE" ? normalized.slice(0, 1) : normalized;
  }, [savedMode, savedTargets]);

  const isDirty =
    mode !== savedMode ||
    JSON.stringify(normalizedDraftTargets) !==
      JSON.stringify(normalizedSavedTargets);

  const canTest =
    mode === "INHERIT_DEFAULT"
      ? policy.defaultRouteTargets.length > 0
      : normalizedDraftTargets.length > 0;

  const persistDraft = async () => {
    if (!target) return;
    if (isGlobalDefault) {
      await updatePolicyMutation.mutateAsync({
        isEnabled: masterEnabled,
        autoScoreApplications,
        defaultRouteMode: mode as AiProxyMode,
        defaultRouteTargets: normalizedDraftTargets,
      });
    } else {
      await updateRoutesMutation.mutateAsync({
        routes: routes.map((r) =>
          r.feature === target
            ? {
                feature: r.feature,
                isEnabled: r.isEnabled,
                mode,
                targets: normalizedDraftTargets,
              }
            : {
                feature: r.feature,
                isEnabled: r.isEnabled,
                mode: r.mode,
                targets: r.mode === "INHERIT_DEFAULT" ? [] : r.targets,
              },
        ),
      });
    }
  };

  const handleSave = async () => {
    try {
      await persistDraft();
      toast.success(t("settings.integrations.ai.routesSaved"));
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  const handleTest = async () => {
    if (!target) return;
    try {
      if (isDirty) {
        await persistDraft();
      }
      const res = await testRouteMutation.mutateAsync(target);
      setTestResult(res);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.AI_CONNECTION_FAILED"));
    }
  };

  const title = !target
    ? ""
    : isGlobalDefault
      ? t("settings.integrations.ai.globalDefaultTitle")
      : t(`settings.integrations.ai.features.${target}`);

  const description = !target
    ? ""
    : isGlobalDefault
      ? t("settings.integrations.ai.globalDefaultDesc")
      : t(`settings.integrations.ai.features.${target}_DESC`);

  const modeChoices: readonly AiFeatureRouteMode[] = isGlobalDefault
    ? AI_PROXY_MODES
    : AI_FEATURE_ROUTE_MODES;

  const okCount = testResult
    ? testResult.attempts.filter((a) => a.ok).length
    : 0;

  return (
    <SlideOver
      isOpen={Boolean(target)}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      disableClose={isSaving || isTesting}
    >
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
        {/* Routing Mode */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">
            {t("settings.integrations.ai.modeLabel")}
          </div>
          <div
            role="radiogroup"
            aria-label={t("settings.integrations.ai.modeLabel")}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            {modeChoices.map((modeKey) => {
              const isSelected = mode === modeKey;
              return (
                <button
                  key={modeKey}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isSaving || isTesting}
                  onClick={() => setMode(modeKey)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer disabled:opacity-50",
                    isSelected
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  <span className="truncate">
                    {t(`settings.integrations.ai.modes.${modeKey}`)}
                  </span>
                  {isSelected && (
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t(`settings.integrations.ai.modes.${mode}_DESC`)}
          </p>
        </div>

        {/* Assigned Connections */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">
            {t("settings.integrations.ai.targetsLabel")}
          </div>

          {mode === "INHERIT_DEFAULT" ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                {policy.defaultRouteTargets.length > 0
                  ? t("settings.integrations.ai.inheritingDefaultSummary", {
                      mode: t(
                        `settings.integrations.ai.modes.${policy.defaultRouteMode}`,
                      ),
                      count: policy.defaultRouteTargets.length,
                    })
                  : t("settings.integrations.ai.inheritingDefaultEmpty")}
              </p>

              {policy.defaultRouteTargets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {policy.defaultRouteTargets.map((tgt, idx) => {
                    const conn = connections.find(
                      (c) => c.id === tgt.connectionId,
                    );
                    return (
                      <Badge
                        key={tgt.connectionId}
                        variant="secondary"
                        className="text-[11px] font-normal"
                      >
                        {policy.defaultRouteMode === "FAILOVER"
                          ? `#${idx + 1} `
                          : ""}
                        {conn ? conn.name : tgt.connectionId}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <AiRouteTargetPool
              poolId={target ?? "drawer-route"}
              mode={mode as AiProxyMode}
              targets={targets}
              connections={connections}
              disabled={isSaving || isTesting}
              onChange={setTargets}
            />
          )}
        </div>

        {/* Inline Test Result */}
        {testResult && (
          <div className="rounded-lg border border-border bg-background/80 p-3 space-y-2 text-xs">
            <div
              className={cn(
                "font-medium flex items-center gap-1.5",
                testResult.ok
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-destructive",
              )}
            >
              {testResult.ok ? (
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>
                {testResult.ok
                  ? t("settings.integrations.ai.routeTestOk", {
                      ok: okCount,
                      total: testResult.attempts.length,
                    })
                  : t("settings.integrations.ai.routeTestFailed", {
                      total: testResult.attempts.length,
                    })}
              </span>
            </div>

            <div className="space-y-1">
              {testResult.attempts.map((attempt) => (
                <div
                  key={attempt.connectionId}
                  className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                >
                  <span className="text-foreground font-medium truncate">
                    {attempt.connectionName} ({attempt.modelId})
                  </span>
                  {attempt.ok ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                      {t("settings.integrations.ai.routeResultLatency", {
                        ms: attempt.latencyMs,
                      })}
                    </span>
                  ) : (
                    <span className="text-destructive truncate max-w-md">
                      {attempt.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-muted/20">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canTest || isSaving || isTesting}
          onClick={handleTest}
          className="h-8 text-xs gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          {isTesting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isTesting
            ? t("settings.integrations.ai.testingRouteButton")
            : t("settings.integrations.ai.testRouteButton")}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving || isTesting}
            onClick={onClose}
            className="h-8 text-xs cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
          <SettingsButton
            type="button"
            icon={Save}
            disabled={!isDirty || isSaving || isTesting}
            pending={isSaving}
            onClick={handleSave}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {t("common.saveChanges")}
          </SettingsButton>
        </div>
      </div>
    </SlideOver>
  );
}
