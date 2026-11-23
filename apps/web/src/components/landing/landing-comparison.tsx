"use client";

import React from "react";
import { XCircle, CheckCircle2, AlertTriangle, Check } from "lucide-react";
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
    <section
      id="comparison"
      className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20"
    >
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <p className="text-xs font-mono text-muted-foreground mb-2">
          {t("landing.compareEyebrow")}
        </p>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-foreground tracking-tight">
          {t("landing.compareTitle")}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed font-normal">
          {t("landing.compareDesc")}
        </p>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Legacy / Old Way */}
        <div className="rounded-xl border border-border bg-muted/40 p-6 sm:p-8 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-border">
              <div className="p-2 rounded-lg bg-secondary border border-border text-muted-foreground">
                <AlertTriangle className="h-4 w-4 stroke-[1.5]" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground">
                {t("landing.compareOldTitle")}
              </h3>
            </div>

            <div className="space-y-4">
              {comparisonRows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-muted-foreground text-sm leading-relaxed"
                >
                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-1 stroke-[1.5]" />
                  <span>{row.oldText}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modern HaiHire ATS */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-6 sm:p-8 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-border">
              <div className="p-2 rounded-lg bg-secondary border border-border text-foreground">
                <Check className="h-4 w-4 stroke-[1.5]" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground">
                {t("landing.compareHaihireTitle", { brand: "HaiHire" })}
              </h3>
            </div>

            <div className="space-y-4">
              {comparisonRows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-foreground text-sm leading-relaxed font-normal"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0 mt-1 stroke-[1.5]" />
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
