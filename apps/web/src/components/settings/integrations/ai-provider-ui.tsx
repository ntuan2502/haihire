"use client";

import {
  AI_PROVIDER_PRESETS,
  type AiConnectionResponse,
  type AiProvider,
} from "@haihire/shared";
import { cn } from "@/lib/utils";

export const AI_PROVIDER_SHORT_LABELS: Record<AiProvider, string> = {
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
  GEMINI: "Gemini",
  OPENROUTER: "OpenRouter",
  OPENAI_COMPATIBLE: "Custom",
};

export type AiConnectionHealthIssue = "disabled" | "cooldown" | "error" | null;

export function getConnectionHealthIssue(
  conn: Pick<
    AiConnectionResponse,
    "isEnabled" | "cooldownRemainingSec" | "lastStatus"
  >,
): AiConnectionHealthIssue {
  if (!conn.isEnabled) return "disabled";
  if (conn.cooldownRemainingSec > 0) return "cooldown";
  if (conn.lastStatus === "ERROR") return "error";
  return null;
}

export function buildProviderModelOptions(
  provider: AiProvider,
  t: (key: string, params?: Record<string, string | number>) => string,
  extraModelId?: string | null,
) {
  const preset = AI_PROVIDER_PRESETS[provider];
  const recommendedGroup = t("settings.integrations.ai.modelGroupRecommended");
  const otherGroup = t("settings.integrations.ai.modelGroupOther");

  const featured = preset.models.map((m) => {
    const badgeLabel = m.badge
      ? t(`settings.integrations.ai.badges.${m.badge}`)
      : "";
    return {
      value: m.id,
      group: recommendedGroup,
      keywords: `${m.label} ${m.id} ${badgeLabel}`.trim(),
      label: (
        <span className="flex items-center justify-between gap-2 w-full min-w-0">
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-medium text-foreground truncate">
              {m.label}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground truncate">
              {m.id}
            </span>
          </span>
          {m.badge && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                m.badge === "recommended" && "bg-primary/10 text-primary",
                m.badge === "fast" &&
                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                m.badge === "powerful" &&
                  "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                m.badge === "low_cost" &&
                  "bg-amber-500/10 text-amber-700 dark:text-amber-300",
              )}
            >
              {badgeLabel}
            </span>
          )}
        </span>
      ),
    };
  });

  const others = preset.otherModels.map((m) => ({
    value: m.id,
    group: otherGroup,
    keywords: `${m.label} ${m.id}`,
    label: (
      <span className="flex items-center gap-1.5 min-w-0 truncate">
        <span className="font-medium text-foreground truncate">{m.label}</span>
        <span className="text-[11px] font-mono text-muted-foreground truncate">
          {m.id}
        </span>
      </span>
    ),
  }));

  if (
    extraModelId &&
    !preset.models.some((m) => m.id === extraModelId) &&
    !preset.otherModels.some((m) => m.id === extraModelId)
  ) {
    others.unshift({
      value: extraModelId,
      group: otherGroup,
      keywords: extraModelId,
      label: (
        <span className="font-mono text-foreground truncate">
          {extraModelId}
        </span>
      ),
    });
  }

  return [...featured, ...others];
}
