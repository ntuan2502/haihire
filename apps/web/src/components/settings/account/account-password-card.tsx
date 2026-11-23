"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { useState } from "react";
import { Lock, KeyRound } from "lucide-react";
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
    <SettingsCard className="space-y-5">
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("settings.changePasswordTitle")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("settings.changePasswordSub")}
          </p>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            {t("settings.currentPassword")}
          </label>
          <Input
            type="password"
            placeholder={t("settings.currentPasswordPlaceholder")}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="text-xs w-full"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t("settings.newPassword")}
            </label>
            <Input
              type="password"
              placeholder={t("settings.newPasswordPlaceholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="text-xs w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t("settings.confirmNewPassword")}
            </label>
            <Input
              type="password"
              placeholder={t("settings.confirmNewPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="text-xs w-full"
            />
          </div>
        </div>

        <div className="pt-2">
          <SettingsButton
            type="submit"
            icon={Lock}
            pending={isSubmitting}
            disabled={!hasPasswordInput || isSubmitting}
          >
            {isSubmitting
              ? t("settings.updatingPassword")
              : t("settings.updatePasswordBtn")}
          </SettingsButton>
        </div>
      </form>
    </SettingsCard>
  );
}
