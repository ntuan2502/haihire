"use client";

import React from "react";
import { Zap, Clock, ShieldCheck, DollarSign } from "lucide-react";
import { useI18n } from "@/i18n";

export const LandingMetrics: React.FC = () => {
  const { t } = useI18n();

  const metrics = [
    {
      value: t("landing.metric1Value"),
      label: t("landing.metric1Label"),
      desc: t("landing.metric1Desc"),
      icon: Clock,
      color: "text-primary",
      bgBorder: "border-primary/20 bg-primary/5",
    },
    {
      value: t("landing.metric2Value"),
      label: t("landing.metric2Label"),
      desc: t("landing.metric2Desc"),
      icon: Zap,
      color: "text-sky-600 dark:text-sky-400",
      bgBorder: "border-sky-500/20 bg-sky-500/5",
    },
    {
      value: t("landing.metric3Value"),
      label: t("landing.metric3Label"),
      desc: t("landing.metric3Desc"),
      icon: ShieldCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bgBorder: "border-emerald-500/20 bg-emerald-500/5",
    },
    {
      value: t("landing.metric4Value"),
      label: t("landing.metric4Label"),
      desc: t("landing.metric4Desc"),
      icon: DollarSign,
      color: "text-amber-600 dark:text-amber-400",
      bgBorder: "border-amber-500/20 bg-amber-500/5",
    },
  ];

  return (
    <section className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
          {t("landing.metricsEyebrow")}
        </p>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
          {t("landing.metricsTitle")}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className={`rounded-2xl border p-6 backdrop-blur-sm transition-all hover:scale-[1.02] shadow-2xs ${m.bgBorder}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-4xl sm:text-5xl font-black tracking-tight ${m.color}`}
                >
                  {m.value}
                </span>
                <div className="p-2.5 rounded-lg border border-border bg-card shadow-2xs">
                  <Icon className={`h-5 w-5 ${m.color}`} />
                </div>
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">
                {m.label}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                {m.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
