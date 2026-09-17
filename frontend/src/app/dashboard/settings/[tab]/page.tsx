"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useMyOrg } from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useI18n, SUPPORTED_LOCALES } from "@/i18n";
import type { SupportedLocale } from "@/i18n/config";
import { CustomSelect } from "@/components/shared/custom-select";

export default function SubSettingsPage() {
  const params = useParams();
  const rawTab = params?.tab;
  const tab = Array.isArray(rawTab) ? rawTab[0] : (rawTab as string);

  const { user, logout } = useAuth();
  const { data: org } = useMyOrg();
  const { t, locale, setLocale } = useI18n();
  const [timeZone, setTimeZone] = useState("Asia/Ho_Chi_Minh");

  const [appHost, setAppHost] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppHost(window.location.host);
    }
  }, []);

  const displayHost = appHost || "localhost:3000";
  const orgSlug = org?.slug || user?.organization?.slug || "workspace";

  if (tab === "localization") {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("settings.tabs.localization")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.tabs.localizationSub")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("nav.language")}
            </label>
            <CustomSelect
              value={locale}
              onChange={(val) => setLocale(val as SupportedLocale)}
              options={(Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]).map((locKey) => ({
                value: locKey,
                label: (
                  <span className="flex items-center gap-2">
                    <span>{SUPPORTED_LOCALES[locKey].flag}</span>
                    <span>{SUPPORTED_LOCALES[locKey].label}</span>
                  </span>
                ),
              }))}
              className="w-full"
              triggerClassName="h-10 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("settings.timeZone")}
            </label>
            <CustomSelect
              value={timeZone}
              onChange={(val) => setTimeZone(val)}
              options={[
                {
                  value: "Asia/Ho_Chi_Minh",
                  label: "(GMT+07:00) Indochina Time - Hanoi, Bangkok, Jakarta",
                },
                {
                  value: "UTC",
                  label: "(GMT+00:00) UTC",
                },
                {
                  value: "America/New_York",
                  label: "(GMT-05:00) Eastern Time - New York",
                },
              ]}
              className="w-full"
              triggerClassName="h-10 text-xs"
            />
          </div>

          <div className="pt-2">
            <Button
              type="button"
              className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              {t("settings.saveChanges")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "notifications") {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("settings.tabs.notifications")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.tabs.notificationsSub")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("settings.newApplicationAlert")}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("settings.newApplicationAlertDesc")}
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("settings.dailyDigest")}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("settings.dailyDigestDesc")}
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
          </div>

          <div className="pt-2">
            <Button
              type="button"
              className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              {t("settings.saveChanges")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "career-page") {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("settings.tabs.careerPage")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.tabs.careerPageSub")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {t("settings.publicJobBoardLink")}
              </span>
              <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                {displayHost}/careers/{orgSlug}
              </p>
            </div>

            <a
              href={`/careers/${orgSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              <span>{t("settings.preview")}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("settings.publicJobBoardDesc")}
          </p>
        </div>
      </div>
    );
  }

  if (tab === "billing") {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("settings.tabs.billing")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.tabs.billingSub")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                {t("settings.freeStarterPlan")}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                {t("settings.oneActiveJobSlot")}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("settings.upgradeToProDesc")}
              </p>
            </div>

            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
            >
              {t("nav.upgrade")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "account") {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("settings.tabs.account")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.tabs.accountSub")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t("settings.yourName")}
              </label>
              <Input
                type="text"
                disabled
                value={user?.name || "Admin User"}
                className="h-10 text-xs bg-slate-50 dark:bg-slate-950 opacity-80"
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
                className="h-10 text-xs bg-slate-50 dark:bg-slate-950 opacity-80"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={logout}
              className="h-9 px-4 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400"
            >
              {t("nav.signOut")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: Enterprise locked tabs (integrations, ai-configuration, privacy-retention, sso)
  const tabTitles: Record<string, { label: string; sublabel: string }> = {
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
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {t("settings.proEnterpriseFeature")}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t("settings.proEnterpriseDesc")}
        </p>
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-5 h-9"
        >
          {t("settings.viewUpgradePlans")}
        </Link>
      </div>
    </div>
  );
}
