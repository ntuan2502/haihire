"use client";

import { useMemo } from "react";
import {
  Calendar,
  Filter,
  Layers,
  RotateCcw,
  User as UserIcon,
  X,
} from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { CustomSelect, type CustomSelectOption } from "@/components/shared";
import { SettingsButton } from "@/components/settings/settings-button";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers/localization-provider";
import { getUserDisplayName } from "@/lib/utils";
import type { User } from "@/types";
import {
  getAuditActionOptions,
  getAuditResourceOptions,
} from "./audit-log-formatters";

export type AuditDateRangePreset = "all" | "24h" | "7d" | "30d";

interface AuditLogFiltersProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  resource: string;
  onResourceChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  actorId: string;
  onActorChange: (value: string) => void;
  dateRange: AuditDateRangePreset;
  onDateRangeChange: (value: AuditDateRangePreset) => void;
  targetId: string;
  targetLabel?: string;
  onClearTargetId: () => void;
  onResetAll: () => void;
  members: User[];
}

export function AuditLogFilters({
  searchInput,
  onSearchChange,
  resource,
  onResourceChange,
  action,
  onActionChange,
  actorId,
  onActorChange,
  dateRange,
  onDateRangeChange,
  targetId,
  targetLabel,
  onClearTargetId,
  onResetAll,
  members,
}: AuditLogFiltersProps) {
  const { t } = useI18n();
  const { localization } = useLocalization();

  const resourceOptions = useMemo(() => getAuditResourceOptions(t), [t]);
  const actionOptions = useMemo(
    () => getAuditActionOptions(resource, t),
    [resource, t],
  );
  const actorOptions = useMemo<CustomSelectOption<string>[]>(() => {
    const items: CustomSelectOption<string>[] = [
      { value: "", label: t("settings.auditLog.filterAllActors") },
    ];
    for (const member of members) {
      const displayName = getUserDisplayName(member, localization);
      items.push({
        value: member.id,
        label: member.email ? `${displayName} (${member.email})` : displayName,
      });
    }
    return items;
  }, [members, localization, t]);

  const dateRangeOptions = useMemo<CustomSelectOption<AuditDateRangePreset>[]>(
    () => [
      { value: "all", label: t("settings.auditLog.dateRangeAll") },
      { value: "24h", label: t("settings.auditLog.dateRange24h") },
      { value: "7d", label: t("settings.auditLog.dateRange7d") },
      { value: "30d", label: t("settings.auditLog.dateRange30d") },
    ],
    [t],
  );

  const hasActiveFilter = Boolean(
    searchInput.trim() ||
    resource ||
    action ||
    actorId ||
    targetId ||
    dateRange !== "all",
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
        <div className="w-full lg:w-72">
          <SearchInput
            value={searchInput}
            onChange={onSearchChange}
            placeholder={t("settings.auditLog.searchPlaceholder")}
            aria-label={t("settings.auditLog.searchPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 flex-1">
          <CustomSelect
            aria-label={t("settings.auditLog.filterResource")}
            icon={Layers}
            value={resource}
            onChange={onResourceChange}
            options={resourceOptions}
            className="w-full"
          />

          <CustomSelect
            aria-label={t("settings.auditLog.filterAction")}
            icon={Filter}
            value={action}
            onChange={onActionChange}
            options={actionOptions}
            className="w-full"
          />

          <CustomSelect
            aria-label={t("settings.auditLog.filterActor")}
            icon={UserIcon}
            value={actorId}
            onChange={onActorChange}
            options={actorOptions}
            className="w-full"
          />

          <CustomSelect
            aria-label={t("settings.auditLog.filterDateRange")}
            icon={Calendar}
            value={dateRange}
            onChange={(val) => onDateRangeChange(val as AuditDateRangePreset)}
            options={dateRangeOptions}
            className="w-full"
          />
        </div>

        {hasActiveFilter && (
          <SettingsButton
            type="button"
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={onResetAll}
            className="shrink-0 self-start lg:self-auto text-xs text-muted-foreground hover:text-foreground"
          >
            {t("settings.auditLog.resetFilters")}
          </SettingsButton>
        )}
      </div>

      {targetId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">
            {t("settings.auditLog.targetTimelineBanner", {
              target: targetLabel || targetId,
            })}
          </span>
          <SettingsButton
            type="button"
            variant="ghost"
            size="sm"
            icon={X}
            onClick={onClearTargetId}
            className="h-7 px-2 text-xs"
          >
            {t("settings.auditLog.clearTargetTimeline")}
          </SettingsButton>
        </div>
      )}
    </div>
  );
}
