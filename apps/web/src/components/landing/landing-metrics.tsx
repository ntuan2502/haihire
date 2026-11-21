"use client";

import React from "react";
import { useI18n } from "@/i18n";

export const LandingMetrics: React.FC = () => {
  const { t } = useI18n();

  const metrics = [
    {
      value: t("landing.metric1Value"),
      label: t("landing.metric1Label"),
      desc: t("landing.metric1Desc"),
    },
    {
      value: t("landing.metric2Value"),
      label: t("landing.metric2Label"),
      desc: t("landing.metric2Desc"),
    },
    {
      value: t("landing.metric3Value"),
      label: t("landing.metric3Label"),
      desc: t("landing.metric3Desc"),
    },
    {
      value: t("landing.metric4Value"),
      label: t("landing.metric4Label"),
      desc: t("landing.metric4Desc"),
    },
  ];

  return (
    <section className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <p className="text-xs font-mono text-muted-foreground mb-2">
          {t("landing.metricsEyebrow")}
        </p>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-foreground tracking-tight">
          {t("landing.metricsTitle")}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-6 text-card-foreground"
          >
            <div className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground tabular-nums font-mono mb-3">
              {m.value}
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              {m.label}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {m.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
