"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { Lock, KeyRound, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword.trim()) {
      setErrorMsg(t("settings.currentPasswordRequiredError"));
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg(t("settings.passwordTooShortError"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t("settings.passwordMismatchError"));
      return;
    }

    try {
      setIsSubmitting(true);
      await authApi.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      setSuccessMsg(t("settings.passwordChangedSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, t, "settings.changePasswordError"));
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Account Info Card */}
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

      {/* Change Password Card */}
      <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 min-w-0">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("settings.changePasswordTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.changePasswordSub")}
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("settings.currentPassword")}
            </label>
            <Input
              type="password"
              placeholder={t("settings.currentPasswordPlaceholder")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10 text-xs w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t("settings.newPassword")}
              </label>
              <Input
                type="password"
                placeholder={t("settings.newPasswordPlaceholder")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 text-xs w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t("settings.confirmNewPassword")}
              </label>
              <Input
                type="password"
                placeholder={t("settings.confirmNewPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 text-xs w-full"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("settings.updatingPassword")}</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>{t("settings.updatePasswordBtn")}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
