"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n";

export default function SubSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const rawTab = params?.tab;
  const tab = Array.isArray(rawTab) ? rawTab[0] : (rawTab as string);

  const { user, logout } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (tab && tab !== "account") {
      router.replace("/dashboard/settings");
    }
  }, [tab, router]);

  if (tab === "account") {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("settings.tabs.account")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.tabs.accountSub")}
          </p>
        </div>

        <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 min-w-0">
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t("settings.yourName")}
              </label>
              <Input
                type="text"
                disabled
                value={user?.name || "Admin User"}
                className="h-10 text-xs bg-slate-50 dark:bg-slate-950 opacity-80 w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t("settings.emailAddress")}
              </label>
              <Input
                type="email"
                disabled
                value={user?.email || "admin@example.com"}
                className="h-10 text-xs bg-slate-50 dark:bg-slate-950 opacity-80 w-full"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={logout}
              className="w-full sm:w-auto h-9 px-4 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 cursor-pointer"
            >
              {t("nav.signOut")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Locked enterprise & unbuilt tabs
  const tabTitles: Record<string, { label: string; sublabel: string }> = {
    localization: {
      label: t("settings.tabs.localization"),
      sublabel: t("settings.tabs.localizationSub"),
    },
    notifications: {
      label: t("settings.tabs.notifications"),
      sublabel: t("settings.tabs.notificationsSub"),
    },
    "career-page": {
      label: t("settings.tabs.careerPage"),
      sublabel: t("settings.tabs.careerPageSub"),
    },
    billing: {
      label: t("settings.tabs.billing"),
      sublabel: t("settings.tabs.billingSub"),
    },
    integrations: {
      label: t("settings.tabs.integrations"),
      sublabel: t("settings.tabs.integrationsSub"),
    },
    "ai-configuration": {
      label: t("settings.tabs.aiConfiguration"),
      sublabel: t("settings.tabs.aiConfigurationSub"),
    },
    "privacy-retention": {
      label: t("settings.tabs.privacyRetention"),
      sublabel: t("settings.tabs.privacyRetentionSub"),
    },
    sso: {
      label: t("settings.tabs.sso"),
      sublabel: t("settings.tabs.ssoSub"),
    },
  };

  const titleInfo = tabTitles[tab] || {
    label: t("settings.title"),
    sublabel: t("settings.workspace"),
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>{titleInfo.label}</span>
          <Lock className="h-4 w-4 text-slate-400" />
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {titleInfo.sublabel}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-4 max-w-lg mx-auto my-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {titleInfo.label}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          {titleInfo.sublabel}. {t("settings.enterpriseFeatureDesc")}
        </p>
        <div className="pt-2">
          <Button
            type="button"
            disabled
            className="h-9 px-4 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed rounded-xl"
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            <span>{t("common.comingSoon")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
