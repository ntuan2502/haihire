"use client";

import { useId } from "react";
import { Mail } from "lucide-react";
import { cn } from "cn";
import type { EmailTemplate } from "@/lib/email-templates";
import { FlowTemplateSelect } from "./flow-template-selector";

export interface FlowEmailToggleFieldProps {
  hasEmail: boolean;
  email?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  sendLabel: string;
  noEmailHint: string;
  canSelectTemplate: boolean;
  templateSelectId: string;
  templateLabel: string;
  templateValue: string;
  onTemplateChange: (templateId: string) => void;
  activeTemplates: EmailTemplate[];
  disabled?: boolean;
  accent?: "primary" | "emerald" | "destructive";
  extraContent?: React.ReactNode;
}

export function FlowEmailToggleField({
  hasEmail,
  checked,
  onCheckedChange,
  sendLabel,
  noEmailHint,
  canSelectTemplate,
  templateSelectId,
  templateLabel,
  templateValue,
  onTemplateChange,
  activeTemplates,
  disabled = false,
  accent = "primary",
  extraContent,
}: FlowEmailToggleFieldProps) {
  const checkboxId = useId();

  const accentClass =
    accent === "emerald"
      ? "accent-emerald-600 focus-visible:ring-emerald-500"
      : accent === "destructive"
        ? "accent-rose-600 focus-visible:ring-rose-500"
        : "accent-primary focus-visible:ring-ring";

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      {hasEmail ? (
        <>
          <label
            htmlFor={checkboxId}
            className="flex items-start gap-2.5 cursor-pointer select-none"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={checked}
              onChange={(e) => onCheckedChange(e.target.checked)}
              disabled={disabled}
              className={cn(
                "mt-0.5 h-4 w-4 rounded border-input shrink-0",
                accentClass,
              )}
            />
            <span className="text-xs text-foreground leading-relaxed flex items-start gap-1.5 min-w-0 break-all">
              <Mail
                className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{sendLabel}</span>
            </span>
          </label>

          {checked && canSelectTemplate && (
            <FlowTemplateSelect
              selectId={templateSelectId}
              label={templateLabel}
              value={templateValue}
              onChange={onTemplateChange}
              activeTemplates={activeTemplates}
              disabled={disabled}
            />
          )}

          {extraContent}
        </>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Mail
            className="h-3.5 w-3.5 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <span>{noEmailHint}</span>
        </p>
      )}
    </div>
  );
}
