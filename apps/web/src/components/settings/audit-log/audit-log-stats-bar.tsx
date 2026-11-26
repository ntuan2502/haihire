"use client";

import { useState, type FormEvent } from "react";
import { Activity, Clock, Settings2, ShieldAlert } from "lucide-react";
import { AUDIT_RETENTION_PRESETS } from "@haihire/shared";
import { SettingsButton } from "@/components/settings/settings-button";
import { FormModal } from "@/components/shared/form-modal";
import { MetricCard } from "@/components/shared/metric-card";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useAuditLogStatsQuery,
  useUpdateAuditLogRetentionMutation,
} from "@/hooks/use-organization-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function AuditLogStatsBar() {
  const { t } = useI18n();
  const canUpdateOrg = useHasPermission("org:update");
  const { data: stats, isLoading } = useAuditLogStatsQuery();
  const updateRetentionMutation = useUpdateAuditLogRetentionMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const retentionDays = stats?.retentionDays ?? null;
  const retentionDisplay =
    typeof retentionDays === "number"
      ? t("settings.auditLog.retentionDaysValue", { days: retentionDays })
      : t("settings.auditLog.retentionUnlimitedValue");

  const openModal = () => {
    setSelectedDays(retentionDays);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      await updateRetentionMutation.mutateAsync(selectedDays);
      toast.success(t("settings.auditLog.retentionSaveSuccess"));
      setIsModalOpen(false);
    } catch (err) {
      const message = getApiErrorMessage(err, t);
      setModalError(message);
      toast.error(message);
    }
  };

  return (
    <>
      <div
        data-testid="audit-log-stats-bar"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <MetricCard
          label={t("settings.auditLog.statsEvents24h")}
          value={isLoading ? "—" : (stats?.total24h ?? 0)}
          subtext={t("settings.auditLog.statsEvents24hSub")}
          icon={Activity}
          color="blue"
        />

        <MetricCard
          label={t("settings.auditLog.statsSensitive7d")}
          value={isLoading ? "—" : (stats?.sensitive7d ?? 0)}
          subtext={t("settings.auditLog.statsSensitive7dSub")}
          icon={ShieldAlert}
          color={stats && stats.sensitive7d > 0 ? "amber" : "slate"}
        />

        <div className="p-4 sm:p-5 rounded-xl bg-card text-card-foreground border border-border flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {t("settings.auditLog.statsRetentionLabel")}
              </p>
              {canUpdateOrg && (
                <SettingsButton
                  variant="ghost"
                  size="sm"
                  icon={Settings2}
                  onClick={openModal}
                  className="h-8 sm:h-6 px-2 text-[11px]"
                >
                  {t("settings.auditLog.retentionConfigureBtn")}
                </SettingsButton>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                data-testid="audit-retention-value"
                className="text-2xl sm:text-3xl font-medium font-mono tabular-nums text-foreground tracking-tight"
              >
                {isLoading ? "—" : retentionDisplay}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {t("settings.auditLog.retentionSubtitle")}
            </p>
          </div>

          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border bg-secondary text-muted-foreground border-border">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!updateRetentionMutation.isPending) {
            setIsModalOpen(false);
          }
        }}
        onSubmit={handleSave}
        title={t("settings.auditLog.retentionModalTitle")}
        description={t("settings.auditLog.retentionModalDesc")}
        icon={<Clock className="h-4 w-4 text-primary" aria-hidden="true" />}
        size="sm"
        isSubmitting={updateRetentionMutation.isPending}
        submitLabel={t("settings.auditLog.retentionSaveBtn")}
        error={modalError}
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">
              {t("settings.auditLog.retentionOptionLabel")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("settings.auditLog.retentionOptionDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AUDIT_RETENTION_PRESETS.map((preset) => {
              const isSelected = selectedDays === preset;
              const label =
                preset === null
                  ? t("settings.auditLog.retentionUnlimitedValue")
                  : t("settings.auditLog.retentionDaysValue", { days: preset });
              return (
                <button
                  key={preset === null ? "unlimited" : String(preset)}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDays(preset)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground font-semibold"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80",
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isSelected ? "bg-primary" : "bg-muted-foreground/30",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </FormModal>
    </>
  );
}
