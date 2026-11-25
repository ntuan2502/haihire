"use client";

import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  Eye,
  GitCommitHorizontal,
  TableProperties,
} from "lucide-react";
import { SettingsButton } from "@/components/settings/settings-button";
import { UserAvatar } from "@/components/shared";
import { Pagination } from "@/components/shared/pagination";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";
import { formatDateTime, getUserDisplayName } from "@/lib/utils";
import {
  formatAuditFieldLabel,
  formatAuditSummary,
  formatAuditValue,
  getAuditActionBadge,
  getAuditEntityHref,
} from "./audit-log-formatters";

interface AuditLogEntityTimelineProps {
  logs: OrganizationAuditLogRecord[];
  targetLabel: string;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onInspect: (log: OrganizationAuditLogRecord) => void;
  onClearTargetId: () => void;
}

export function AuditLogEntityTimeline({
  logs,
  targetLabel,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onInspect,
  onClearTargetId,
}: AuditLogEntityTimelineProps) {
  const { t } = useI18n();
  const { localization } = useLocalization();

  return (
    <div
      data-testid="audit-entity-timeline"
      className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <GitCommitHorizontal className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold text-foreground truncate">
              {t("settings.auditLog.timelineHeaderTitle")}: {targetLabel}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {t("settings.auditLog.timelineHeaderSubtitle", { count: total })}
            </p>
          </div>
        </div>

        <SettingsButton
          variant="outline"
          size="sm"
          icon={TableProperties}
          onClick={onClearTargetId}
        >
          {t("settings.auditLog.timelineBackToTable")}
        </SettingsButton>
      </div>

      <div className="p-4 sm:p-6">
        <ol className="relative border-l border-border ml-3 space-y-6">
          {logs.map((log) => {
            const badge = getAuditActionBadge(log.action, t);
            const entityHref = getAuditEntityHref(log);
            const changes = Array.isArray(log.changes) ? log.changes : [];
            const visibleChanges = changes.slice(0, 3);
            const hiddenCount = Math.max(0, changes.length - 3);
            const actorName = log.actor
              ? getUserDisplayName(log.actor, localization)
              : log.actorNameSnapshot ||
                log.actorEmailSnapshot ||
                t("settings.auditLog.systemActor");

            return (
              <li
                key={log.id}
                data-testid={`timeline-event-${log.id}`}
                className="relative pl-6"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card"
                />

                <div className="rounded-xl border border-border bg-background/60 p-3.5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <time
                        dateTime={log.createdAt}
                        className="text-[11px] font-mono tabular-nums text-muted-foreground"
                      >
                        {formatDateTime(log.createdAt, localization)}
                      </time>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {entityHref && (
                        <Link
                          href={entityHref}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          <span>{t("settings.auditLog.openEntity")}</span>
                        </Link>
                      )}
                      <SettingsButton
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        onClick={() => onInspect(log)}
                      >
                        {t("settings.auditLog.viewDetails")}
                      </SettingsButton>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-foreground">
                    {formatAuditSummary(log, t)}
                  </p>

                  {visibleChanges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {visibleChanges.map((change, idx) => (
                        <span
                          key={`${change.field}-${idx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border text-[11px] text-foreground max-w-full"
                        >
                          <span className="font-medium text-muted-foreground">
                            {formatAuditFieldLabel(change.field, t)}:
                          </span>
                          <span className="line-through text-muted-foreground truncate max-w-[140px]">
                            {formatAuditValue(change.field, change.before, t)}
                          </span>
                          <ArrowRight
                            className="h-2.5 w-2.5 text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-semibold text-foreground truncate max-w-[160px]">
                            {formatAuditValue(change.field, change.after, t)}
                          </span>
                        </span>
                      ))}
                      {hiddenCount > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          +
                          {t("settings.auditLog.timelineChangesCount", {
                            count: hiddenCount,
                          })}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-0.5">
                    {log.actor ? (
                      <UserAvatar
                        name={actorName}
                        avatarUrl={log.actor.avatarUrl}
                        size="sm"
                      />
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      {actorName}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {total > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          className="px-4 py-3 border-t border-border bg-muted/30"
        />
      )}
    </div>
  );
}
