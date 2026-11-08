"use client";

import React from "react";
import { XCircle, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n";

export const LandingComparison: React.FC = () => {
  const { t } = useI18n();

  const comparisonRows = [
    {
      oldText: t("landing.compareRow1Old"),
      newText: t("landing.compareRow1New"),
    },
    {
      oldText: t("landing.compareRow2Old"),
      newText: t("landing.compareRow2New"),
    },
    {
      oldText: t("landing.compareRow3Old"),
      newText: t("landing.compareRow3New"),
    },
    {
      oldText: t("landing.compareRow4Old"),
      newText: t("landing.compareRow4New"),
    },
  ];

  return (
    <section id="comparison" className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-cyan-400 mb-2">
          {t("landing.compareEyebrow")}
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {t("landing.compareTitle")}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300/80 leading-relaxed font-normal">
          {t("landing.compareDesc")}
        </p>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Legacy / Old Way */}
        <div className="rounded-3xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/40 dark:bg-slate-950/60 p-6 sm:p-8 backdrop-blur-xl relative flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-rose-200/80 dark:border-rose-500/10">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border dark:border-rose-500/20 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-rose-900 dark:text-rose-200">
                {t("landing.compareOldTitle")}
              </h3>
            </div>

            <div className="space-y-4">
              {comparisonRows.map((row, idx) => (
                <div key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                  <XCircle className="h-5 w-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{row.oldText}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modern HaiHire ATS */}
        <div className="rounded-3xl border border-blue-200/90 dark:border-blue-500/40 bg-gradient-to-b from-blue-50/80 via-white to-slate-50 dark:from-blue-950/40 dark:via-slate-900/90 dark:to-slate-950/90 p-6 sm:p-8 backdrop-blur-xl relative flex flex-col justify-between shadow-xl ring-1 ring-blue-500/20 dark:ring-blue-500/30">
          <div>
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-blue-200 dark:border-blue-500/20">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-600/20 dark:border dark:border-blue-500/40 dark:text-cyan-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {t("landing.compareHaihireTitle", { brand: "HaiHire" })}
              </h3>
            </div>

            <div className="space-y-4">
              {comparisonRows.map((row, idx) => (
                <div key={idx} className="flex items-start gap-3 text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-medium">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{row.newText}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
