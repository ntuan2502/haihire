"use client";

import { useI18n } from "@/i18n";
import { Link2, Copy, Check } from "lucide-react";

interface LinkUrlBannerProps {
  url: string;
  onCopy: () => void;
  isCopied: boolean;
}

export function LinkUrlBanner({ url, onCopy, isCopied }: LinkUrlBannerProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card text-card-foreground border border-border shadow-2xs overflow-hidden">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
          <Link2 className="h-4 w-4" />
        </div>
        <p className="text-xs font-mono text-foreground truncate select-all">
          {url}
        </p>
      </div>

      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
      >
        {isCopied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-600 dark:text-emerald-400">
              {t("common.copied")}
            </span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            <span>{t("common.copy")}</span>
          </>
        )}
      </button>
    </div>
  );
}
