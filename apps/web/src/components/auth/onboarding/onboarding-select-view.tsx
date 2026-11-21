"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "cn";
import { OrganizationLogo } from "@/components/shared/organization-logo";
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("onboarding.selectOrgTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("onboarding.selectOrgSubtitle")}
        </p>
      </div>

      {/* Organization Cards List */}
      <div className="space-y-2.5">
        {orgsLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">
              {t("onboarding.loadingWorkspaces")}
            </p>
          </div>
        ) : displayOrgs.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-border bg-card/50">
            <p className="text-sm text-muted-foreground">
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
                  "w-full p-4 rounded-xl border bg-card text-card-foreground flex items-center justify-between cursor-pointer transition-colors group text-left",
                  isActive
                    ? "border-primary/40 shadow-xs ring-1 ring-ring/20"
                    : "border-border hover:border-ring/40 hover:bg-accent/40",
                )}
              >
                <div className="flex items-center gap-3.5">
                  <OrganizationLogo
                    name={org.name}
                    logoUrl={org.logoUrl}
                    size="lg"
                    decorative
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {org.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </div>
                </div>

                {isActive ? (
                  <span className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {t("onboarding.activeBadge")}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
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
          className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
        >
          {t("onboarding.createOrgLink")}
        </button>
        <button
          type="button"
          onClick={() => onSwitchMode("join")}
          className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
        >
          {t("onboarding.joinOrgLink")}
        </button>
      </div>
    </div>
  );
}
