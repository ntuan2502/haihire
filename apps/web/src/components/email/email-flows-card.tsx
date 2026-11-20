"use client";

import type { ElementType } from "react";
import {
  AlertTriangle,
  Award,
  Calendar,
  FileText,
  GitBranch,
  UserX,
} from "lucide-react";
import { CustomSelect } from "@/components/shared";
import { useI18n } from "@/i18n";
import {
  EMAIL_FLOW_KEYS,
  getEmailFlowDescription,
  getEmailFlowTitle,
  getEmailTemplateTypeLabel,
  type EmailFlowConfig,
  type EmailFlowKey,
  type EmailTemplate,
} from "@/lib/email-templates";
import { cn } from "cn";

const FLOW_ICONS: Record<EmailFlowKey, ElementType> = {
  APPLICATION_RECEIVED: FileText,
  INTERVIEW_SCHEDULED: Calendar,
  APPLICATION_REJECTED: UserX,
  APPLICATION_OFFER: Award,
};

export interface EmailFlowsCardProps {
  flows: EmailFlowConfig[];
  templates: EmailTemplate[];
  canManage: boolean;
  isUpdating?: boolean;
  onUpdateFlow: (
    flowKey: EmailFlowKey,
    data: { templateId?: string | null; enabled?: boolean },
  ) => void;
}

export function EmailFlowsCard({
  flows,
  templates,
  canManage,
  isUpdating = false,
  onUpdateFlow,
}: EmailFlowsCardProps) {
  const { t } = useI18n();

  const flowMap = new Map(flows.map((flow) => [flow.flowKey, flow]));

  const templateOptions = [
    {
      value: "",
      label: t("email.flowUnassigned"),
    },
    ...templates.map((tpl) => ({
      value: tpl.id,
      label: tpl.enabled
        ? `${tpl.name} — ${getEmailTemplateTypeLabel(tpl.type, t)}`
        : `${tpl.name} (${t("email.statusDisabled")})`,
    })),
  ];

  return (
    <section className="w-full rounded-xl border border-border bg-card text-card-foreground p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground">
          <GitBranch className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("email.flowsSectionTitle")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("email.flowsSectionDesc")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {EMAIL_FLOW_KEYS.map((flowKey) => {
          const flow = flowMap.get(flowKey);
          const IconComp = FLOW_ICONS[flowKey] || GitBranch;
          const selectedTemplateId = flow?.templateId ?? "";
          const assignedTemplate = templates.find(
            (tpl) => tpl.id === selectedTemplateId,
          );
          const isTemplateMissing = !selectedTemplateId || !assignedTemplate;
          const isTemplateDisabled = Boolean(
            assignedTemplate && !assignedTemplate.enabled,
          );
          const isFlowEnabled = Boolean(flow?.enabled && !isTemplateMissing);

          return (
            <div
              key={flowKey}
              className="rounded-lg border border-border bg-muted/40 p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-card border border-border text-foreground">
                    <IconComp className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-foreground">
                      {getEmailFlowTitle(flowKey, t)}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {getEmailFlowDescription(flowKey, t)}
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    aria-label={getEmailFlowTitle(flowKey, t)}
                    checked={isFlowEnabled}
                    disabled={!canManage || isUpdating || isTemplateMissing}
                    onChange={(e) =>
                      onUpdateFlow(flowKey, { enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-input accent-primary focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      isFlowEnabled && !isTemplateDisabled
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                        : "bg-secondary border-border text-muted-foreground",
                    )}
                  >
                    {isFlowEnabled && !isTemplateDisabled
                      ? t("email.flowAutoEnabled")
                      : t("email.flowAutoDisabled")}
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                <CustomSelect
                  size="sm"
                  aria-label={getEmailFlowTitle(flowKey, t)}
                  value={selectedTemplateId}
                  disabled={!canManage || isUpdating}
                  placeholder={t("email.selectTemplateOption")}
                  options={templateOptions}
                  onChange={(nextId) => {
                    const normalized = nextId || null;
                    onUpdateFlow(flowKey, {
                      templateId: normalized,
                      enabled: normalized ? (flow?.enabled ?? false) : false,
                    });
                  }}
                  className="w-full"
                  triggerClassName="h-9 text-xs bg-background"
                />

                {isTemplateMissing && (
                  <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("email.flowWarningUnassigned")}</span>
                  </p>
                )}

                {!isTemplateMissing && isTemplateDisabled && (
                  <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("email.flowWarningTemplateDisabled")}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
