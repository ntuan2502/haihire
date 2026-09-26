"use client";

import React from "react";
import { PlusCircle, Sparkles, Send } from "lucide-react";
import { useI18n } from "@/i18n";

export const LandingWorkflow: React.FC = () => {
  const { t } = useI18n();

  const steps = [
    {
      num: t("landing.step1Num"),
      title: t("landing.step1Title"),
      desc: t("landing.step1Desc"),
      icon: PlusCircle,
      accent: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/40",
    },
    {
      num: t("landing.step2Num"),
      title: t("landing.step2Title"),
      desc: t("landing.step2Desc"),
      icon: Sparkles,
      accent: "text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40",
    },
    {
      num: t("landing.step3Num"),
      title: t("landing.step3Title"),
      desc: t("landing.step3Desc"),
      icon: Send,
      accent: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40",
    },
  ];

  return (
    <section id="workflow" className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-cyan-400 mb-2">
          {t("landing.workflowEyebrow")}
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {t("landing.workflowTitle")}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300/80 leading-relaxed font-normal">
          {t("landing.workflowDesc")}
        </p>
      </div>

      {/* 3 Step Cards with connecting line */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className="relative flex flex-col rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/60 p-8 backdrop-blur-xl hover:border-slate-300 dark:hover:border-white/20 transition-all hover:-translate-y-1 shadow-sm"
            >
              {/* Step Number & Icon */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-300 dark:text-slate-400/40 font-mono">
                  {step.num}
                </span>
                <div className={`p-3 rounded-2xl border ${step.accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              {/* Title & Desc */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300/80 leading-relaxed font-normal">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
