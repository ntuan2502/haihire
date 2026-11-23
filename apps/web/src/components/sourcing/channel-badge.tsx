"use client";

import { SourcingChannel } from "@haihire/shared";
import { useI18n } from "@/i18n";
import { cn } from "cn";

interface ChannelBadgeProps {
  channel: SourcingChannel | string;
  customLabel?: string | null;
  className?: string;
  size?: "sm" | "md";
}

const CHANNEL_STYLES: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  [SourcingChannel.LINKEDIN]: {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/25",
    dot: "bg-sky-600",
  },
  [SourcingChannel.INDEED]: {
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/25",
    dot: "bg-violet-600",
  },
  [SourcingChannel.GOOGLE_JOBS]: {
    bg: "bg-rose-50 dark:bg-rose-950/60",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200/70 dark:border-rose-800/70",
    dot: "bg-rose-600",
  },
  [SourcingChannel.CAREER_SITE]: {
    bg: "bg-sky-50 dark:bg-sky-950/60",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200/70 dark:border-sky-800/70",
    dot: "bg-sky-600",
  },
  [SourcingChannel.REFERRAL]: {
    bg: "bg-amber-50 dark:bg-amber-950/60",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/70 dark:border-amber-800/70",
    dot: "bg-amber-600",
  },
  [SourcingChannel.HANDSHAKE]: {
    bg: "bg-stone-100 dark:bg-stone-900/60",
    text: "text-stone-700 dark:text-stone-300",
    border: "border-stone-200/70 dark:border-stone-800/70",
    dot: "bg-stone-600",
  },
  [SourcingChannel.EMAIL]: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/70 dark:border-emerald-800/70",
    dot: "bg-emerald-600",
  },
  [SourcingChannel.WE_WORK_REMOTELY]: {
    bg: "bg-teal-50 dark:bg-teal-950/60",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200/70 dark:border-teal-800/70",
    dot: "bg-teal-600",
  },
  [SourcingChannel.STACK_OVERFLOW]: {
    bg: "bg-orange-50 dark:bg-orange-950/60",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200/70 dark:border-orange-800/70",
    dot: "bg-orange-600",
  },
  [SourcingChannel.TWITTER_X]: {
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    border: "border-border",
    dot: "bg-foreground",
  },
  [SourcingChannel.REDDIT]: {
    bg: "bg-orange-50 dark:bg-orange-950/60",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200/70 dark:border-orange-800/70",
    dot: "bg-orange-500",
  },
  [SourcingChannel.GLASSDOOR]: {
    bg: "bg-green-50 dark:bg-green-950/60",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200/70 dark:border-green-800/70",
    dot: "bg-green-600",
  },
  [SourcingChannel.FACEBOOK]: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/25",
    dot: "bg-cyan-600",
  },
  [SourcingChannel.DIRECT]: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
  [SourcingChannel.OTHER]: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
};

export function getChannelColor(channel: SourcingChannel | string): string {
  return CHANNEL_STYLES[channel]?.dot || "bg-muted-foreground";
}

export function ChannelBadge({
  channel,
  customLabel,
  className,
  size = "md",
}: ChannelBadgeProps) {
  const { t } = useI18n();

  const style =
    CHANNEL_STYLES[channel] || CHANNEL_STYLES[SourcingChannel.OTHER];
  const translatedName =
    customLabel ||
    (t as (key: string) => string)(`sourcing.channels.${channel}`) ||
    channel;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-md border transition-colors select-none",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />
      <span className="truncate max-w-[120px]">{translatedName}</span>
    </span>
  );
}
