"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import type { ElementType } from "react";
import {
  Award,
  Calendar,
  Copy,
  FileText,
  Mail,
  Plus,
  UserCheck,
} from "lucide-react";
import { useI18n } from "@/i18n";
import {
  getEmailFlowTitle,
  getEmailTemplateTypeLabel,
  type EmailFlowKey,
  type EmailTemplate,
  type EmailTemplateType,
} from "@/lib/email-templates";
import { cn } from "cn";

export const TEMPLATE_ICONS: Record<EmailTemplateType, ElementType> = {
  APPLICATION_CONFIRMATION: FileText,
  INTERVIEW_INVITATION: Calendar,
  REJECTION: UserCheck,
  OFFER: Award,
  CUSTOM: Mail,
};

interface EmailTemplateLibrarySidebarProps {
  templates: EmailTemplate[];
  activeTemplate: EmailTemplate | null;
  onSelectTemplate: (tpl: EmailTemplate) => void;
  onOpenCreateModal: () => void;
  onDuplicateTemplate: (tpl: EmailTemplate) => void;
  flowAssignmentsByTemplateId: Map<string, EmailFlowKey[]>;
  canManageTemplates: boolean;
}

export function EmailTemplateLibrarySidebar({
  templates,
  activeTemplate,
  onSelectTemplate,
  onOpenCreateModal,
  onDuplicateTemplate,
  flowAssignmentsByTemplateId,
  canManageTemplates,
}: EmailTemplateLibrarySidebarProps) {
  const { t } = useI18n();

  return (
    <div className="xl:col-span-4 rounded-xl border border-border bg-card text-card-foreground p-4 shadow-xs space-y-3.5">
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            {t("email.libraryTitle")}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("email.libraryDesc")}
          </p>
        </div>
        {canManageTemplates && (
          <SettingsButton
            type="button"
            size="sm"
            icon={Plus}
            onClick={onOpenCreateModal}
            className="shrink-0"
          >
            {t("email.newTemplateBtn")}
          </SettingsButton>
        )}
      </div>

      <div className="space-y-2 max-h-[260px] sm:max-h-[340px] xl:max-h-[620px] overflow-y-auto pr-0.5">
        {templates.map((tpl) => {
          const IconComp = TEMPLATE_ICONS[tpl.type] || Mail;
          const isSelected = activeTemplate?.id === tpl.id;
          const assignedFlows = flowAssignmentsByTemplateId.get(tpl.id) ?? [];

          return (
            <div
              key={tpl.id}
              onClick={() => onSelectTemplate(tpl)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTemplate(tpl);
                }
              }}
              className={cn(
                "w-full p-3.5 rounded-lg border text-left transition-colors cursor-pointer space-y-2",
                isSelected
                  ? "border-primary bg-accent/60 ring-1 ring-ring/30"
                  : "border-border bg-background hover:bg-accent/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "p-1.5 rounded-md shrink-0",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <IconComp className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {tpl.name}
                  </span>
                </div>

                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                    tpl.enabled
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                      : "bg-secondary border-border text-muted-foreground",
                  )}
                >
                  {tpl.enabled
                    ? t("email.statusEnabled")
                    : t("email.statusDisabled")}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {tpl.subject}
              </p>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                      tpl.isSystem
                        ? "bg-primary/10 border-primary/20 text-foreground"
                        : "bg-secondary border-border text-secondary-foreground",
                    )}
                  >
                    {tpl.isSystem
                      ? t("email.systemBadge")
                      : t("email.customBadge")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {getEmailTemplateTypeLabel(tpl.type, t)}
                  </span>
                </div>

                {canManageTemplates && !tpl.id.startsWith("tpl-") && (
                  <SettingsButton
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onDuplicateTemplate(tpl);
                    }}
                    title={t("email.duplicateBtn")}
                    aria-label={t("email.duplicateBtn")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </SettingsButton>
                )}
              </div>

              {assignedFlows.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">
                    {t("email.assignedFlowsLabel")}
                  </span>
                  {assignedFlows.map((flowKey) => (
                    <span
                      key={flowKey}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
                    >
                      {getEmailFlowTitle(flowKey, t)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
