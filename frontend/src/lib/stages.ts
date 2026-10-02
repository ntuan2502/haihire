import {
  ApplicationStage,
  VALID_APPLICATION_STAGE_TRANSITIONS,
} from "@haihire/shared";
import { useI18n } from "@/i18n";

export { VALID_APPLICATION_STAGE_TRANSITIONS };

export interface StageConfig {
  id: ApplicationStage;
  label: string;
  actionLabel: string;
  stepNumber: number;
  // Dot indicator
  dotColor: string;
  // Progress/Pipeline bar fill
  barColor: string;
  // Badge on candidate cards/rows
  badgeBg: string;
  textColor: string;
  // Metric summary card (used in Dashboard & Job cards)
  cardBg: string;
  cardHover: string;
  cardBorder: string;
  // Interactive pill filter (used in Job details pipeline)
  activePill: string;
  pillBadge: string;
  // Action button (used for Quick Stage Transition)
  btnBg: string;
  btnHover: string;
}

export const STAGES_ORDER: ApplicationStage[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
];

export const STAGE_CONFIG_MAP: Record<ApplicationStage, StageConfig> = {
  APPLIED: {
    id: "APPLIED",
    label: "New",
    actionLabel: "New",
    stepNumber: 1,
    dotColor: "bg-blue-500",
    barColor: "bg-blue-500",
    badgeBg:
      "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/60",
    textColor: "text-blue-600 dark:text-blue-400",
    cardBg: "bg-blue-50/70 dark:bg-blue-950/40",
    cardHover: "hover:bg-blue-100/70",
    cardBorder: "border-blue-100 dark:border-blue-900/40",
    activePill:
      "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    pillBadge: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
    btnBg: "bg-blue-600",
    btnHover: "hover:bg-blue-700",
  },
  SCREENING: {
    id: "SCREENING",
    label: "Screening",
    actionLabel: "Screening",
    stepNumber: 2,
    dotColor: "bg-purple-500",
    barColor: "bg-purple-500",
    badgeBg:
      "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-900/60",
    textColor: "text-purple-600 dark:text-purple-400",
    cardBg: "bg-purple-50/70 dark:bg-purple-950/40",
    cardHover: "hover:bg-purple-100/70",
    cardBorder: "border-purple-100 dark:border-purple-900/40",
    activePill:
      "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    pillBadge:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300",
    btnBg: "bg-purple-600",
    btnHover: "hover:bg-purple-700",
  },
  INTERVIEW: {
    id: "INTERVIEW",
    label: "Interview",
    actionLabel: "Interview",
    stepNumber: 3,
    dotColor: "bg-amber-500",
    barColor: "bg-amber-500",
    badgeBg:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60",
    textColor: "text-amber-600 dark:text-amber-400",
    cardBg: "bg-amber-50/70 dark:bg-amber-950/40",
    cardHover: "hover:bg-amber-100/70",
    cardBorder: "border-amber-100 dark:border-amber-900/40",
    activePill:
      "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    pillBadge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
    btnBg: "bg-amber-500",
    btnHover: "hover:bg-amber-600",
  },
  OFFER: {
    id: "OFFER",
    label: "Offer",
    actionLabel: "Offer",
    stepNumber: 4,
    dotColor: "bg-teal-500",
    barColor: "bg-teal-500",
    badgeBg:
      "bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-900/60",
    textColor: "text-teal-600 dark:text-teal-400",
    cardBg: "bg-teal-50/70 dark:bg-teal-950/40",
    cardHover: "hover:bg-teal-100/70",
    cardBorder: "border-teal-100 dark:border-teal-900/40",
    activePill:
      "bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
    pillBadge: "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300",
    btnBg: "bg-teal-600",
    btnHover: "hover:bg-teal-700",
  },
  HIRED: {
    id: "HIRED",
    label: "Hired",
    actionLabel: "Hired",
    stepNumber: 5,
    dotColor: "bg-emerald-500",
    barColor: "bg-emerald-500",
    badgeBg:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60",
    textColor: "text-emerald-600 dark:text-emerald-400",
    cardBg: "bg-emerald-50/70 dark:bg-emerald-950/40",
    cardHover: "hover:bg-emerald-100/70",
    cardBorder: "border-emerald-100 dark:border-emerald-900/40",
    activePill:
      "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    pillBadge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    btnBg: "bg-emerald-600",
    btnHover: "hover:bg-emerald-700",
  },
  REJECTED: {
    id: "REJECTED",
    label: "Rejected",
    actionLabel: "Reject",
    stepNumber: 6,
    dotColor: "bg-rose-500",
    barColor: "bg-rose-500",
    badgeBg:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/60",
    textColor: "text-rose-600 dark:text-rose-400",
    cardBg: "bg-rose-50/70 dark:bg-rose-950/40",
    cardHover: "hover:bg-rose-100/70",
    cardBorder: "border-rose-100 dark:border-rose-900/40",
    activePill:
      "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    pillBadge: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
    btnBg: "bg-rose-600",
    btnHover: "hover:bg-rose-700",
  },
};

export const PIPELINE_STAGES: StageConfig[] = STAGES_ORDER.map(
  (stage) => STAGE_CONFIG_MAP[stage],
);

/**
 * Get unified stage metadata (label, dot color, badge styles, cards, buttons)
 */
export function getStageInfo(
  stage?: ApplicationStage | string | null,
): StageConfig {
  if (stage && stage in STAGE_CONFIG_MAP) {
    return STAGE_CONFIG_MAP[stage as ApplicationStage];
  }
  return {
    id: "APPLIED",
    label: stage || "New",
    actionLabel: stage || "New",
    stepNumber: 1,
    dotColor: "bg-slate-400",
    barColor: "bg-slate-400",
    badgeBg:
      "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    textColor: "text-slate-600 dark:text-slate-300",
    cardBg: "bg-slate-50/70 dark:bg-slate-800/60",
    cardHover: "hover:bg-slate-100/70",
    cardBorder: "border-slate-200/60 dark:border-slate-700/60",
    activePill:
      "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    pillBadge:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    btnBg: "bg-slate-600",
    btnHover: "hover:bg-slate-700",
  };
}

/**
 * Hook to get unified stage metadata with localized label
 */
export function useStageInfo(stage?: ApplicationStage | string | null): StageConfig {
  const { t } = useI18n();
  const rawInfo = getStageInfo(stage);

  const stageKeyMap: Record<ApplicationStage, "applied" | "screening" | "interview" | "offer" | "hired" | "rejected"> = {
    APPLIED: "applied",
    SCREENING: "screening",
    INTERVIEW: "interview",
    OFFER: "offer",
    HIRED: "hired",
    REJECTED: "rejected",
  };

  const stageId = rawInfo.id as ApplicationStage;
  const translationKey = stageKeyMap[stageId];
  const localizedLabel = translationKey ? t(`pipeline.stages.${translationKey}` as const) : rawInfo.label;

  return {
    ...rawInfo,
    label: localizedLabel,
    actionLabel: localizedLabel,
  };
}

/**
 * Hook to get all pipeline stages with localized labels in order
 */
export function usePipelineStages(): StageConfig[] {
  const { t } = useI18n();

  const stageKeyMap: Record<ApplicationStage, "applied" | "screening" | "interview" | "offer" | "hired" | "rejected"> = {
    APPLIED: "applied",
    SCREENING: "screening",
    INTERVIEW: "interview",
    OFFER: "offer",
    HIRED: "hired",
    REJECTED: "rejected",
  };

  return STAGES_ORDER.map((stage) => {
    const raw = STAGE_CONFIG_MAP[stage];
    const key = stageKeyMap[stage];
    const localizedLabel = key ? t(`pipeline.stages.${key}` as const) : raw.label;
    return {
      ...raw,
      label: localizedLabel,
      actionLabel: localizedLabel,
    };
  });
}

/**
 * Check whether an application stage transition is valid according to the ATS state machine.
 *
 * Rules:
 * - from === to -> true (no-op)
 * - Otherwise, must be in VALID_APPLICATION_STAGE_TRANSITIONS[from]
 */
export function canTransition(
  from?: ApplicationStage | string | null,
  to?: ApplicationStage | string | null,
): boolean {
  if (!from || !to) return false;
  if (from === to) return true;
  const allowed = VALID_APPLICATION_STAGE_TRANSITIONS[from as ApplicationStage];
  return allowed ? allowed.includes(to as ApplicationStage) : false;
}

/**
 * Get human-readable localized reason why an application stage transition is disabled.
 */
export function getTransitionDisabledReason(
  from?: ApplicationStage | string | null,
  to?: ApplicationStage | string | null,
  t?: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!from || !to || from === to) return "";
  const fromStage = from as ApplicationStage;
  const toStage = to as ApplicationStage;

  if (fromStage === "HIRED") {
    if (t) {
      try {
        const msg = t("pipeline.tooltips.cannotMoveHired", { from: fromStage, to: toStage });
        if (msg && msg !== "pipeline.tooltips.cannotMoveHired") return msg;
      } catch {
        // Fallback
      }
    }
    return `Ứng viên đã HIRED không thể quay lại ${toStage}`;
  }

  if (fromStage === "REJECTED") {
    if (t) {
      try {
        const msg = t("pipeline.tooltips.cannotMoveRejected", { from: fromStage, to: toStage });
        if (msg && msg !== "pipeline.tooltips.cannotMoveRejected") return msg;
      } catch {
        // Fallback
      }
    }
    return `Ứng viên đã REJECTED không thể chuyển sang ${toStage}`;
  }

  if (t) {
    try {
      const msg = t("pipeline.tooltips.invalidTransition", { from: fromStage, to: toStage });
      if (msg && msg !== "pipeline.tooltips.invalidTransition") return msg;
    } catch {
      // Fallback
    }
  }
  return `Không thể chuyển từ ${fromStage} sang ${toStage}`;
}

