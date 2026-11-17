"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { useState } from "react";
import { Lock, KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import type { User } from "@/types";

interface AccountPasswordCardProps {
  setSession?: (
    accessToken: string,
    refreshToken?: string,
    user?: User,
  ) => void;
}

export function AccountPasswordCard({ setSession }: AccountPasswordCardProps) {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasPasswordInput = Boolean(
    currentPassword && newPassword && confirmPassword,
  );

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!currentPassword) {
      toast.error(t("settings.currentPasswordRequiredError"));
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error(t("settings.passwordTooShortError"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMismatchError"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      if (res.accessToken) {
        setSession?.(res.accessToken, res.refreshToken, undefined);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("settings.passwordChangedSuccess"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "settings.passwordChangeFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 min-w-0">
      <div className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {t("settings.changePasswordTitle")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("settings.changePasswordSub")}
          </p>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
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
          <SettingsButton
            type="submit"
            disabled={!hasPasswordInput || isSubmitting}
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
          </SettingsButton>
        </div>
      </form>
    </div>
  );
}
