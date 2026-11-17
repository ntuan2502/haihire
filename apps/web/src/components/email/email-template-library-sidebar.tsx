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
    <div className="xl:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3.5">
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {t("email.libraryTitle")}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("email.libraryDesc")}
          </p>
        </div>
        {canManageTemplates && (
          <SettingsButton
            type="button"
            size="sm"
            onClick={onOpenCreateModal}
            className="shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("email.newTemplateBtn")}</span>
          </SettingsButton>
        )}
      </div>

      <div className="space-y-2 max-h-[620px] overflow-y-auto pr-0.5">
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
                "w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-2",
                isSelected
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 ring-1 ring-blue-600/20"
                  : "border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
                    )}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {tpl.name}
                  </span>
                </div>

                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                    tpl.enabled
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                      : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700",
                  )}
                >
                  {tpl.enabled
                    ? t("email.statusEnabled")
                    : t("email.statusDisabled")}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                {tpl.subject}
              </p>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                      tpl.isSystem
                        ? "bg-blue-50/70 border-blue-200/70 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300"
                        : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
                    )}
                  >
                    {tpl.isSystem
                      ? t("email.systemBadge")
                      : t("email.customBadge")}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
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
                <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-400">
                    {t("email.assignedFlowsLabel")}
                  </span>
                  {assignedFlows.map((flowKey) => (
                    <span
                      key={flowKey}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
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
