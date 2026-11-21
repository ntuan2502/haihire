"use client";

import React from "react";
import { PlusCircle, FileCheck, Send } from "lucide-react";
import { useI18n } from "@/i18n";

export const LandingWorkflow: React.FC = () => {
  const { t } = useI18n();

  const steps = [
    {
      num: t("landing.step1Num"),
      title: t("landing.step1Title"),
      desc: t("landing.step1Desc"),
      icon: PlusCircle,
    },
    {
      num: t("landing.step2Num"),
      title: t("landing.step2Title"),
      desc: t("landing.step2Desc"),
      icon: FileCheck,
    },
    {
      num: t("landing.step3Num"),
      title: t("landing.step3Title"),
      desc: t("landing.step3Desc"),
      icon: Send,
    },
  ];

  return (
    <section
      id="workflow"
      className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20"
    >
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <p className="text-xs font-mono text-muted-foreground mb-2">
          {t("landing.workflowEyebrow")}
        </p>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-foreground tracking-tight">
          {t("landing.workflowTitle")}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed font-normal">
          {t("landing.workflowDesc")}
        </p>
      </div>

      {/* 3 Step Cards */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className="relative flex flex-col rounded-xl border border-border bg-card text-card-foreground p-6 sm:p-8 hover:border-foreground/20 transition-colors"
            >
              {/* Step Number & Icon */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-2xl font-mono font-medium tabular-nums text-muted-foreground">
                  {step.num}
                </span>
                <div className="p-2.5 rounded-lg border border-border bg-secondary text-foreground">
                  <Icon className="h-5 w-5 stroke-[1.5]" />
                </div>
              </div>

              {/* Title & Desc */}
              <h3 className="text-lg font-medium text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
