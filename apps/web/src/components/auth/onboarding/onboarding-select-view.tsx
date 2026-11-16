"use client";

import { Building2, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "cn";
import type { Organization } from "@/types";
import { useI18n } from "@/i18n";

interface OnboardingSelectViewProps {
  orgsLoading: boolean;
  displayOrgs: Organization[];
  activeOrgId?: string | null;
  onSelectOrg: (org: Organization) => void;
  onSwitchMode: (mode: "select" | "create" | "join") => void;
}

export function OnboardingSelectView({
  orgsLoading,
  displayOrgs,
  activeOrgId,
  onSelectOrg,
  onSwitchMode,
}: OnboardingSelectViewProps) {
  const { t } = useI18n();

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("onboarding.selectOrgTitle")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("onboarding.selectOrgSubtitle")}
        </p>
      </div>

      {/* Organization Cards List */}
      <div className="space-y-2.5">
        {orgsLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-xs text-slate-400">
              {t("onboarding.loadingWorkspaces")}
            </p>
          </div>
        ) : displayOrgs.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <p className="text-sm text-slate-500">
              {t("onboarding.noWorkspaces")}
            </p>
          </div>
        ) : (
          displayOrgs.map((org) => {
            const isActive = org.id === activeOrgId;
            return (
              <button
                type="button"
                key={org.id}
                onClick={() => onSelectOrg(org)}
                className={cn(
                  "w-full p-4 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-between cursor-pointer transition-all group text-left",
                  isActive
                    ? "border-slate-300 dark:border-slate-700 shadow-xs ring-1 ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40",
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {org.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {org.slug}
                    </p>
                  </div>
                </div>

                {isActive ? (
                  <span className="text-[11px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                    {t("onboarding.activeBadge")}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    {t("onboarding.openWorkspace")}{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Action Links Below */}
      <div className="mt-7 flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={() => onSwitchMode("create")}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
        >
          {t("onboarding.createOrgLink")}
        </button>
        <button
          type="button"
          onClick={() => onSwitchMode("join")}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
        >
          {t("onboarding.joinOrgLink")}
        </button>
      </div>
    </div>
  );
}
