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
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
          <Link2 className="h-4 w-4" />
        </div>
        <p className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all">
          {url}
        </p>
      </div>

      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
      >
        {isCopied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-600 dark:text-emerald-400">
              {t("sourcing.details.copied")}
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
