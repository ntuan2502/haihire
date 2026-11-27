"use client";

import { useEffect, useState } from "react";
import {
  MAX_AI_CONNECTIONS_PER_ORG,
  type AiConnectionResponse,
  type AiFeatureRouteResponse,
  type AiPolicyResponse,
} from "@haihire/shared";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Pencil,
  PlugZap,
  Plus,
  Trash2,
} from "lucide-react";
import { SettingsButton } from "@/components/settings/settings-button";
import { ConfirmDestructiveModal } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useDeleteAiConnectionMutation,
  useTestAiConnectionMutation,
  useUpdateAiConnectionMutation,
} from "@/hooks/use-ai-setting-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AiConnectionModal } from "./ai-connection-modal";
import { AI_PROVIDER_SHORT_LABELS } from "./ai-provider-ui";

export interface AiConnectionsSectionProps {
  connections: AiConnectionResponse[];
  policy: AiPolicyResponse;
  routes: AiFeatureRouteResponse[];
  disabled?: boolean;
}

export function AiConnectionsSection({
  connections,
  policy,
  routes,
  disabled = false,
}: AiConnectionsSectionProps) {
  const { t } = useI18n();
  const updateMutation = useUpdateAiConnectionMutation();
  const deleteMutation = useDeleteAiConnectionMutation();
  const testMutation = useTestAiConnectionMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<AiConnectionResponse | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiConnectionResponse | null>(
    null,
  );

  useEffect(() => {
    if (disabled) {
      setIsModalOpen(false);
      setDeleteTarget(null);
    }
  }, [disabled]);

  const findReferencingRouteLabels = (connectionId: string): string[] => {
    const labels: string[] = [];
    if (
      policy.defaultRouteTargets.some(
        (tgt) => tgt.connectionId === connectionId,
      )
    ) {
      labels.push(t("settings.integrations.ai.globalDefaultTitle"));
    }
    for (const route of routes) {
      if (route.targets.some((tgt) => tgt.connectionId === connectionId)) {
        labels.push(t(`settings.integrations.ai.features.${route.feature}`));
      }
    }
    return labels;
  };

  const handleToggleConnection = async (conn: AiConnectionResponse) => {
    if (disabled) return;
    setTogglingId(conn.id);
    try {
      await updateMutation.mutateAsync({
        id: conn.id,
        data: { isEnabled: !conn.isEnabled },
      });
      toast.success(t("settings.integrations.ai.connectionUpdated"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    } finally {
      setTogglingId(null);
    }
  };

  const handleTestConnection = async (conn: AiConnectionResponse) => {
    if (disabled) return;
    setTestingId(conn.id);
    try {
      const res = await testMutation.mutateAsync({
        connectionId: conn.id,
        provider: conn.provider,
        modelId: conn.defaultModelId,
        baseUrl: conn.baseUrl,
      });
      toast.success(
        t("settings.integrations.ai.testSuccess", {
          model: res.model,
          latencyMs: res.latencyMs,
        }),
      );
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.AI_CONNECTION_FAILED"));
    } finally {
      setTestingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (disabled || !deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(t("settings.integrations.ai.connectionDeleted"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  const referencingLabels = deleteTarget
    ? findReferencingRouteLabels(deleteTarget.id)
    : [];

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3.5 transition-opacity",
        disabled && "opacity-60",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {t("settings.integrations.ai.connectionsTitle")}
          </h3>
          <Badge variant="secondary" className="text-[11px] font-medium">
            {connections.length}/{MAX_AI_CONNECTIONS_PER_ORG}
          </Badge>
        </div>

        <SettingsButton
          type="button"
          icon={Plus}
          disabled={
            disabled || connections.length >= MAX_AI_CONNECTIONS_PER_ORG
          }
          onClick={() => {
            if (disabled) return;
            setEditingConnection(null);
            setIsModalOpen(true);
          }}
          className="shrink-0 w-full sm:w-auto cursor-pointer disabled:cursor-not-allowed"
        >
          {t("settings.integrations.ai.addConnectionButton")}
        </SettingsButton>
      </div>

      {connections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center space-y-2.5">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">
              {t("settings.integrations.ai.emptyConnectionsTitle")}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              {t("settings.integrations.ai.emptyConnectionsDesc")}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border bg-background/40 overflow-hidden">
          {connections.map((conn) => {
            const isTesting = testingId === conn.id;
            const isToggling = togglingId === conn.id;

            return (
              <div
                key={conn.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 transition-colors",
                  !conn.isEnabled && "opacity-70 bg-muted/20",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                    {conn.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium h-5 shrink-0"
                  >
                    {AI_PROVIDER_SHORT_LABELS[conn.provider] || conn.provider}
                  </Badge>
                  <span className="text-[11px] font-mono text-muted-foreground truncate">
                    {conn.defaultModelId}
                  </span>
                  {conn.apiKeyLast4 && (
                    <span className="text-[11px] font-mono text-muted-foreground/80 shrink-0">
                      ••••{conn.apiKeyLast4}
                    </span>
                  )}

                  {!conn.isEnabled ? (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-medium h-5 shrink-0"
                    >
                      {t("settings.integrations.ai.disabledBadge")}
                    </Badge>
                  ) : conn.cooldownRemainingSec > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 shrink-0">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {t("settings.integrations.ai.cooldownBadge", {
                        sec: conn.cooldownRemainingSec,
                      })}
                    </span>
                  ) : conn.lastStatus === "HEALTHY" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium shrink-0">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      {t("settings.integrations.ai.statusHealthy")}
                    </span>
                  ) : conn.lastStatus === "ERROR" ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] text-destructive font-medium shrink-0"
                      title={conn.lastError || undefined}
                    >
                      <AlertTriangle
                        className="h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                      {t("settings.integrations.ai.statusError")}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {t("settings.integrations.ai.statusUntested")}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={conn.isEnabled}
                    disabled={disabled || isToggling}
                    aria-label={`${t("settings.integrations.ai.toggleConnectionLabel")}: ${conn.name}`}
                    onClick={() => handleToggleConnection(conn)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mr-1",
                      conn.isEnabled ? "bg-primary" : "bg-muted-foreground/30",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-xs transition-transform",
                        conn.isEnabled ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled || isTesting}
                    onClick={() => handleTestConnection(conn)}
                    aria-label={`${t("settings.integrations.ai.testButton")}: ${conn.name}`}
                    title={t("settings.integrations.ai.testButton")}
                    className="h-8 w-8 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isTesting ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setEditingConnection(conn);
                      setIsModalOpen(true);
                    }}
                    aria-label={`${t("common.edit")}: ${conn.name}`}
                    title={t("common.edit")}
                    className="h-8 w-8 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) setDeleteTarget(conn);
                    }}
                    aria-label={`${t("common.delete")}: ${conn.name}`}
                    title={t("common.delete")}
                    className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AiConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingConnection={editingConnection}
      />

      <ConfirmDestructiveModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t("settings.integrations.ai.deleteConfirmTitle")}
        description={t("settings.integrations.ai.deleteConfirmMessage", {
          name: deleteTarget?.name ?? "",
        })}
        notice={
          referencingLabels.length > 0
            ? t("settings.integrations.ai.deleteInUseWarning", {
                routes: referencingLabels.join(", "),
              })
            : undefined
        }
        confirmButtonLabel={t("common.delete")}
        cancelButtonLabel={t("common.cancel")}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </section>
  );
}
