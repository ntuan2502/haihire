"use client";

import { useEffect, useState } from "react";
import {
  AI_FEATURE_KEYS,
  type AiConnectionResponse,
  type AiFeatureKey,
  type AiFeatureRouteMode,
  type AiFeatureRouteResponse,
  type AiPolicyResponse,
  type AiRouteTestTarget,
  type TestAiRouteResponse,
} from "@haihire/shared";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PlugZap,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useTestAiRouteMutation,
  useUpdateAiRoutesMutation,
} from "@/hooks/use-ai-setting-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getConnectionHealthIssue } from "./ai-provider-ui";
import { AiRouteConfigDrawer } from "./ai-route-config-drawer";

export interface AiRoutingSectionProps {
  connections: AiConnectionResponse[];
  policy: AiPolicyResponse;
  routes: AiFeatureRouteResponse[];
  masterEnabled: boolean;
  autoScoreApplications: boolean;
  onToggleAutoScore: () => void;
  isUpdatingAutoScore: boolean;
  disabled?: boolean;
}

export function AiRoutingSection({
  connections,
  policy,
  routes,
  masterEnabled,
  autoScoreApplications,
  onToggleAutoScore,
  isUpdatingAutoScore,
  disabled = false,
}: AiRoutingSectionProps) {
  const { t } = useI18n();
  const updateRoutesMutation = useUpdateAiRoutesMutation();
  const testRouteMutation = useTestAiRouteMutation();

  const [activeDrawerTarget, setActiveDrawerTarget] =
    useState<AiRouteTestTarget | null>(null);
  const [togglingFeature, setTogglingFeature] = useState<AiFeatureKey | null>(
    null,
  );
  const [testingDefault, setTestingDefault] = useState(false);
  const [defaultTestResult, setDefaultTestResult] =
    useState<TestAiRouteResponse | null>(null);

  useEffect(() => {
    if (disabled) {
      setActiveDrawerTarget(null);
    }
  }, [disabled]);

  const resolvedRoutes: AiFeatureRouteResponse[] = AI_FEATURE_KEYS.map(
    (featureKey) =>
      routes.find((r) => r.feature === featureKey) ?? {
        feature: featureKey,
        isEnabled: true,
        mode: "INHERIT_DEFAULT" as AiFeatureRouteMode,
        targets: [],
      },
  );

  const handleToggleFeature = async (featureKey: AiFeatureKey) => {
    if (disabled) return;
    setTogglingFeature(featureKey);
    try {
      await updateRoutesMutation.mutateAsync({
        routes: resolvedRoutes.map((r) => ({
          feature: r.feature,
          isEnabled: r.feature === featureKey ? !r.isEnabled : r.isEnabled,
          mode: r.mode,
          targets: r.mode === "INHERIT_DEFAULT" ? [] : r.targets,
        })),
      });
      toast.success(t("settings.integrations.ai.featureToggleSaved"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    } finally {
      setTogglingFeature(null);
    }
  };

  const handleTestDefault = async () => {
    if (disabled || policy.defaultRouteTargets.length === 0) return;
    setTestingDefault(true);
    try {
      const res = await testRouteMutation.mutateAsync("GLOBAL_DEFAULT");
      setDefaultTestResult(res);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.AI_CONNECTION_FAILED"));
    } finally {
      setTestingDefault(false);
    }
  };

  const okCount = defaultTestResult
    ? defaultTestResult.attempts.filter((a) => a.ok).length
    : 0;

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4 transition-opacity",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.integrations.ai.routingTitle")}
        </h3>
      </div>

      {/* Block 1: Organization Default Route Summary Bar */}
      <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-semibold text-foreground">
                {t("settings.integrations.ai.globalDefaultTitle")}
              </h4>
              <Badge variant="secondary" className="text-[10px] font-medium">
                {t(
                  `settings.integrations.ai.modesShort.${policy.defaultRouteMode}`,
                )}
              </Badge>
            </div>

            {policy.defaultRouteTargets.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t("settings.integrations.ai.noTargetsHint")}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {policy.defaultRouteTargets.map((tgt, idx) => {
                  const conn = connections.find(
                    (c) => c.id === tgt.connectionId,
                  );
                  const issue = conn ? getConnectionHealthIssue(conn) : "error";
                  return (
                    <span
                      key={tgt.connectionId}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-foreground"
                    >
                      {policy.defaultRouteMode === "FAILOVER" && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #{idx + 1}
                        </span>
                      )}
                      <span className="truncate max-w-[160px]">
                        {conn ? conn.name : tgt.connectionId}
                      </span>
                      {policy.defaultRouteMode === "LOAD_BALANCE" &&
                        tgt.weight > 1 && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            ×{tgt.weight}
                          </span>
                        )}
                      {issue && (
                        <AlertTriangle
                          className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0"
                          aria-label={t("settings.integrations.ai.statusError")}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                disabled ||
                policy.defaultRouteTargets.length === 0 ||
                testingDefault
              }
              onClick={handleTestDefault}
              className="h-8 text-xs gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {testingDefault ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {testingDefault
                ? t("settings.integrations.ai.testingRouteButton")
                : t("settings.integrations.ai.testRouteButton")}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                if (!disabled) setActiveDrawerTarget("GLOBAL_DEFAULT");
              }}
              aria-label={`${t("settings.integrations.ai.configureButton")}: ${t("settings.integrations.ai.globalDefaultTitle")}`}
              className="h-8 text-xs gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              {t("settings.integrations.ai.configureButton")}
            </Button>
          </div>
        </div>

        {defaultTestResult && (
          <div className="rounded-lg border border-border bg-background/80 p-3 space-y-2 text-xs">
            <div
              className={cn(
                "font-medium flex items-center gap-1.5",
                defaultTestResult.ok
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-destructive",
              )}
            >
              {defaultTestResult.ok ? (
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>
                {defaultTestResult.ok
                  ? t("settings.integrations.ai.routeTestOk", {
                      ok: okCount,
                      total: defaultTestResult.attempts.length,
                    })
                  : t("settings.integrations.ai.routeTestFailed", {
                      total: defaultTestResult.attempts.length,
                    })}
              </span>
            </div>

            <div className="space-y-1">
              {defaultTestResult.attempts.map((attempt) => (
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

      {/* Block 2: Compact Feature AI List */}
      <div className="rounded-lg border border-border divide-y divide-border bg-background/40 overflow-hidden">
        {resolvedRoutes.map((route) => {
          const isToggling = togglingFeature === route.feature;
          const singleConn =
            route.mode === "SINGLE" && route.targets[0]
              ? connections.find((c) => c.id === route.targets[0].connectionId)
              : null;
          const hasPoolWarning = route.targets.some((tgt) => {
            const conn = connections.find((c) => c.id === tgt.connectionId);
            return !conn || Boolean(getConnectionHealthIssue(conn));
          });

          return (
            <div
              key={route.feature}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 transition-colors",
                !route.isEnabled && "bg-muted/20",
              )}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div
                  className={cn(
                    "text-xs font-medium text-foreground",
                    !route.isEnabled && "text-muted-foreground",
                  )}
                >
                  {t(`settings.integrations.ai.features.${route.feature}`)}
                </div>

                {route.feature === "APPLICATION_SCORING" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoScoreApplications}
                      disabled={
                        disabled || !route.isEnabled || isUpdatingAutoScore
                      }
                      aria-label={t("settings.integrations.ai.autoScoreLabel")}
                      onClick={onToggleAutoScore}
                      className={cn(
                        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                        autoScoreApplications
                          ? "bg-primary"
                          : "bg-muted-foreground/30",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none block h-3 w-3 rounded-full bg-background shadow-xs transition-transform",
                          autoScoreApplications
                            ? "translate-x-3"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                    <span
                      className={cn(
                        "text-[11px] text-muted-foreground",
                        (!route.isEnabled || disabled) && "opacity-60",
                      )}
                    >
                      {t("settings.integrations.ai.autoScoreLabel")}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                {route.mode === "INHERIT_DEFAULT" ? (
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-normal"
                  >
                    {t("settings.integrations.ai.inheritBadge")}
                  </Badge>
                ) : route.mode === "SINGLE" ? (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-normal max-w-[200px] inline-flex items-center gap-1"
                  >
                    <span className="truncate">
                      {singleConn
                        ? singleConn.name
                        : t("settings.integrations.ai.noTargetsHint")}
                    </span>
                    {singleConn && getConnectionHealthIssue(singleConn) && (
                      <AlertTriangle
                        className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-normal inline-flex items-center gap-1"
                  >
                    <span>
                      {t("settings.integrations.ai.routeTargetCount", {
                        mode: t(
                          `settings.integrations.ai.modesShort.${route.mode}`,
                        ),
                        count: route.targets.length,
                      })}
                    </span>
                    {hasPoolWarning && (
                      <AlertTriangle
                        className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </Badge>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || !route.isEnabled}
                  onClick={() => {
                    if (!disabled && route.isEnabled) {
                      setActiveDrawerTarget(route.feature);
                    }
                  }}
                  aria-label={`${t("settings.integrations.ai.configureButton")}: ${t(`settings.integrations.ai.features.${route.feature}`)}`}
                  className="h-8 text-xs gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <SlidersHorizontal
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  {t("settings.integrations.ai.configureButton")}
                </Button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={route.isEnabled}
                  disabled={disabled || isToggling}
                  aria-label={`${t("settings.integrations.ai.featureEnableLabel")}: ${t(`settings.integrations.ai.features.${route.feature}`)}`}
                  onClick={() => handleToggleFeature(route.feature)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                    route.isEnabled ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-xs transition-transform",
                      route.isEnabled ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AiRouteConfigDrawer
        target={activeDrawerTarget}
        connections={connections}
        policy={policy}
        routes={resolvedRoutes}
        masterEnabled={masterEnabled}
        autoScoreApplications={autoScoreApplications}
        onClose={() => setActiveDrawerTarget(null)}
      />
    </section>
  );
}
