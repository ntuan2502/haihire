"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { CustomSelect } from "@/components/shared";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useEmailFlows, useEmailTemplates } from "@/hooks/use-email-queries";
import {
  getEmailTemplateTypeLabel,
  type EmailFlowConfig,
  type EmailFlowKey,
  type EmailTemplate,
} from "@/lib/email-templates";
import { useI18n } from "@/i18n";

export interface UseFlowTemplateSelectionResult {
  canViewEmail: boolean;
  flows: EmailFlowConfig[];
  templates: EmailTemplate[];
  activeTemplates: EmailTemplate[];
  matchedFlow: EmailFlowConfig | undefined;
  defaultSendEnabled: boolean;
  defaultTemplateId: string;
}

export function useFlowTemplateSelection(
  flowKey: EmailFlowKey,
  isOpen: boolean,
): UseFlowTemplateSelectionResult {
  const canViewEmail = useHasPermission("email:view");

  let rawTemplates: EmailTemplate[] | undefined;
  try {
    const templatesQuery = useEmailTemplates(undefined, {
      enabled: isOpen && canViewEmail,
    });
    rawTemplates = Array.isArray(templatesQuery?.data)
      ? templatesQuery.data
      : undefined;
  } catch {
    // Fallback when QueryClientProvider is absent or partially mocked in unit tests
    rawTemplates = undefined;
  }

  let rawFlows: EmailFlowConfig[] | undefined;
  try {
    const flowsQuery = useEmailFlows(undefined, {
      enabled: isOpen && canViewEmail,
    });
    rawFlows = Array.isArray(flowsQuery?.data) ? flowsQuery.data : undefined;
  } catch {
    rawFlows = undefined;
  }

  const templates = useMemo(() => rawTemplates ?? [], [rawTemplates]);
  const flows = useMemo(() => rawFlows ?? [], [rawFlows]);

  const matchedFlow = useMemo(
    () => flows.find((flow) => flow.flowKey === flowKey),
    [flows, flowKey],
  );

  const activeTemplates = useMemo(
    () => templates.filter((tpl) => Boolean(tpl.enabled)),
    [templates],
  );

  const defaultTemplateId = useMemo(() => {
    if (
      matchedFlow?.templateId &&
      activeTemplates.some((tpl) => tpl.id === matchedFlow.templateId)
    ) {
      return matchedFlow.templateId;
    }
    return activeTemplates[0]?.id ?? "";
  }, [matchedFlow, activeTemplates]);

  const defaultSendEnabled = Boolean(
    matchedFlow?.enabled && matchedFlow?.template?.enabled,
  );

  return {
    canViewEmail,
    flows,
    templates,
    activeTemplates,
    matchedFlow,
    defaultSendEnabled,
    defaultTemplateId,
  };
}

export interface FlowTemplateSelectProps {
  label: string;
  value: string;
  onChange: (templateId: string) => void;
  activeTemplates: EmailTemplate[];
  disabled?: boolean;
  selectId?: string;
}

export function FlowTemplateSelect({
  label,
  value,
  onChange,
  activeTemplates,
  disabled = false,
  selectId,
}: FlowTemplateSelectProps) {
  const { t } = useI18n();

  if (activeTemplates.length === 0) {
    return (
      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/70 px-2.5 py-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{t("email.noActiveTemplates")}</span>
      </div>
    );
  }

  return (
    <div className="mt-2.5 space-y-1.5">
      <label
        htmlFor={selectId}
        className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300"
      >
        {label}
      </label>
      <CustomSelect
        id={selectId}
        size="sm"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={t("email.selectTemplateOption")}
        options={activeTemplates.map((tpl) => ({
          value: tpl.id,
          label: `${tpl.name} (${getEmailTemplateTypeLabel(tpl.type, t)})`,
        }))}
        className="w-full"
        triggerClassName="h-8 text-xs"
      />
    </div>
  );
}
