"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  History,
  Info,
} from "lucide-react";
import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers/localization-provider";
import { formatDateTime, getUserDisplayName } from "@/lib/utils";
import { SlideOver, UserAvatar } from "@/components/shared";
import { SettingsButton } from "@/components/settings/settings-button";
import {
  formatAuditFieldLabel,
  formatAuditMetadataLines,
  formatAuditSummary,
  formatAuditValue,
  getAuditActionBadge,
  getAuditEntityHref,
  getAuditResourceLabel,
  parseUserAgent,
} from "./audit-log-formatters";

interface AuditLogDetailDrawerProps {
  log: OrganizationAuditLogRecord | null;
  onClose: () => void;
  onViewEntityTimeline: (targetId: string) => void;
}

export function AuditLogDetailDrawer({
  log,
  onClose,
  onViewEntityTimeline,
}: AuditLogDetailDrawerProps) {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      // Clipboard may be blocked in restricted browser contexts
    }
  };

  if (!log) {
    return (
      <SlideOver
        isOpen={false}
        onClose={onClose}
        title={t("settings.auditLog.drawerTitle")}
        size="xl"
      >
        <div />
      </SlideOver>
    );
  }

  const badge = getAuditActionBadge(log.action, t);
  const entityHref = getAuditEntityHref(log);
  const changes = Array.isArray(log.changes) ? log.changes : [];
  const legacyLines =
    changes.length === 0 ? formatAuditMetadataLines(log, t) : [];
  const actorName = log.actor
    ? getUserDisplayName(log.actor, localization)
    : log.actorNameSnapshot || log.actorEmailSnapshot || null;
  const actorEmail = log.actor?.email || log.actorEmailSnapshot || null;
  const parsedClient = parseUserAgent(log.userAgent);
  const rawPayload = JSON.stringify(
    {
      targetId: log.targetId ?? null,
      targetLabel: log.targetLabel ?? null,
      changes: log.changes ?? null,
      metadata: log.metadata ?? null,
    },
    null,
    2,
  );

  return (
    <SlideOver
      isOpen={Boolean(log)}
      onClose={onClose}
      title={t("settings.auditLog.drawerTitle")}
      description={formatDateTime(log.createdAt, localization)}
      size="xl"
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
        {/* Header Summary Block */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-card border border-border text-foreground">
              {getAuditResourceLabel(log.resource, t)}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {formatAuditSummary(log, t)}
          </p>
        </div>

        {/* Section 1: Field Diff List (Before -> After) */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("settings.auditLog.sectionChanges")}
          </h3>

          {changes.length > 0 ? (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {changes.map((entry, idx) => (
                <div
                  key={`${log.id}-diff-${entry.field}-${idx}`}
                  className="p-3.5 space-y-2"
                >
                  <div className="text-xs font-semibold text-foreground">
                    {formatAuditFieldLabel(entry.field, t)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2.5">
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        {t("settings.auditLog.colBefore")}
                      </div>
                      <span className="inline-block max-w-full px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-mono text-[11px] leading-relaxed break-all">
                        {formatAuditValue(entry.field, entry.before, t)}
                      </span>
                    </div>
                    <ArrowRight
                      className="w-3.5 h-3.5 text-muted-foreground sm:mt-5 shrink-0 hidden sm:block"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        {t("settings.auditLog.colAfter")}
                      </div>
                      <span className="inline-block max-w-full px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono text-[11px] leading-relaxed break-all">
                        {formatAuditValue(entry.field, entry.after, t)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : legacyLines.length > 0 ? (
            <ul className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border text-xs text-foreground list-disc list-inside">
              {legacyLines.map((line, index) => (
                <li key={`${log.id}-legacy-${index}`}>{line}</li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3.5 text-xs text-muted-foreground">
              <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t("settings.auditLog.noChangesRecorded")}</span>
            </div>
          )}
        </section>

        {/* Section 2: Trace & Entity Context */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("settings.auditLog.sectionContext")}
          </h3>

          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden text-xs">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-muted-foreground shrink-0">
                {t("settings.auditLog.labelActor")}
              </span>
              {actorName ? (
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar
                    name={actorName}
                    avatarUrl={log.actor?.avatarUrl}
                    size="xs"
                    rounded="full"
                  />
                  <div className="text-right min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {actorName}
                    </div>
                    {actorEmail && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {actorEmail}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-foreground font-medium">
                  {t("settings.auditLog.systemActor")}
                </span>
              )}
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-muted-foreground shrink-0">
                {t("settings.auditLog.labelTarget")}
              </span>
              <span className="font-medium text-foreground text-right min-w-0 break-words">
                {log.targetLabel || getAuditResourceLabel(log.resource, t)}
              </span>
            </div>

            {log.targetId && (
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-muted-foreground shrink-0">
                  {t("settings.auditLog.labelTargetId")}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <code
                    className="font-mono text-[11px] text-foreground truncate max-w-[200px]"
                    title={log.targetId}
                  >
                    {log.targetId}
                  </code>
                  <SettingsButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy("targetId", log.targetId!)}
                    aria-label={t("common.copy")}
                    className="h-6 px-1.5 text-[11px] shrink-0"
                  >
                    {copiedKey === "targetId" ? (
                      <>
                        <Check className="w-3 h-3" aria-hidden="true" />
                        <span>{t("common.copied")}</span>
                      </>
                    ) : (
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    )}
                  </SettingsButton>
                </div>
              </div>
            )}

            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-muted-foreground shrink-0">
                {t("settings.auditLog.labelIpAddress")}
              </span>
              <span className="font-mono text-[11px] text-foreground">
                {log.ipAddress || t("settings.auditLog.valueEmpty")}
              </span>
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-muted-foreground shrink-0">
                {t("settings.auditLog.labelClient")}
              </span>
              <span
                className="text-foreground text-right min-w-0 truncate max-w-[260px]"
                title={log.userAgent || undefined}
              >
                {parsedClient || t("settings.auditLog.valueEmpty")}
              </span>
            </div>

            {log.requestId && (
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-muted-foreground shrink-0">
                  {t("settings.auditLog.labelRequestId")}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <code
                    className="font-mono text-[11px] text-foreground truncate max-w-[200px]"
                    title={log.requestId}
                  >
                    {log.requestId}
                  </code>
                  <SettingsButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy("requestId", log.requestId!)}
                    aria-label={t("common.copy")}
                    className="h-6 px-1.5 text-[11px] shrink-0"
                  >
                    {copiedKey === "requestId" ? (
                      <>
                        <Check className="w-3 h-3" aria-hidden="true" />
                        <span>{t("common.copied")}</span>
                      </>
                    ) : (
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    )}
                  </SettingsButton>
                </div>
              </div>
            )}

            {(entityHref || log.targetId) && (
              <div className="px-4 py-3 bg-muted/20 flex flex-col sm:flex-row gap-2">
                {log.targetId && (
                  <SettingsButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={History}
                    onClick={() => {
                      onViewEntityTimeline(log.targetId!);
                      onClose();
                    }}
                    className="flex-1 justify-center"
                  >
                    {t("settings.auditLog.viewEntityTimeline")}
                  </SettingsButton>
                )}
                {entityHref && (
                  <Link
                    href={entityHref}
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 h-8 text-xs font-medium text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors flex-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("settings.auditLog.openEntity")}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Collapsible Raw JSON Payload */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <SettingsButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRawJson((prev) => !prev)}
              className="-ml-2 text-xs px-2"
            >
              {showRawJson ? (
                <ChevronUp className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              ) : (
                <ChevronDown
                  className="w-3.5 h-3.5 mr-1.5"
                  aria-hidden="true"
                />
              )}
              <span>
                {showRawJson
                  ? t("settings.auditLog.hideRawJson")
                  : t("settings.auditLog.showRawJson")}
              </span>
            </SettingsButton>

            {showRawJson && (
              <SettingsButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy("rawJson", rawPayload)}
                className="h-7 px-2 text-xs"
              >
                {copiedKey === "rawJson" ? (
                  <>
                    <Check className="w-3 h-3 mr-1" aria-hidden="true" />
                    <span>{t("common.copied")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" aria-hidden="true" />
                    <span>{t("common.copy")}</span>
                  </>
                )}
              </SettingsButton>
            )}
          </div>

          {showRawJson && (
            <pre
              aria-label={t("settings.auditLog.rawPayload")}
              className="rounded-xl border border-border bg-muted/50 p-3.5 text-[11px] font-mono text-foreground whitespace-pre-wrap break-all overflow-y-auto max-h-64"
            >
              {rawPayload}
            </pre>
          )}
        </section>
      </div>
    </SlideOver>
  );
}
