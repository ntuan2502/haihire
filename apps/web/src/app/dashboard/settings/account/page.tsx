"use client";

import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

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
