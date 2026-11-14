"use client";

import { useState, useEffect } from "react";
import { Send, Save, Sliders } from "lucide-react";
import {
  type EmailSettings,
  type EmailProviderType,
  DEFAULT_EMAIL_SETTINGS,
} from "@/lib/email-templates";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useEmailSettings,
  useUpdateEmailSettingsMutation,
  useSendTestEmailMutation,
} from "@/hooks/use-queries";

export default function EmailSettingsPage() {
  const { t } = useI18n();

  const { data: remoteSettings } = useEmailSettings();
  const updateSettingsMutation = useUpdateEmailSettingsMutation();
  const sendTestMutation = useSendTestEmailMutation();

  const [emailSettings, setEmailSettings] = useState<EmailSettings>(
    DEFAULT_EMAIL_SETTINGS,
  );
  const [testEmailAddress, setTestEmailAddress] = useState("");

  // Sync remote settings when fetched with null-safety
  useEffect(() => {
    if (remoteSettings) {
      setEmailSettings({
        provider: remoteSettings.provider || "SIMULATED",
        fromName: remoteSettings.fromName ?? "Recruitment Team",
        fromEmail: remoteSettings.fromEmail ?? "careers@workspace.com",
        smtpHost: remoteSettings.smtpHost ?? "",
        smtpPort: remoteSettings.smtpPort ?? 587,
        smtpUser: remoteSettings.smtpUser ?? "",
        smtpPass: remoteSettings.smtpPass ?? "",
        resendApiKey: remoteSettings.resendApiKey ?? "",
        sendgridApiKey: remoteSettings.sendgridApiKey ?? "",
      });
    }
  }, [remoteSettings]);

  const handleSaveSettings = async () => {
    try {
      const payload: Partial<EmailSettings> = {
        provider: emailSettings.provider,
        fromName: (emailSettings.fromName || "").trim(),
        fromEmail: (emailSettings.fromEmail || "").trim(),
        smtpHost: emailSettings.smtpHost
          ? emailSettings.smtpHost.trim()
          : undefined,
        smtpPort: emailSettings.smtpPort
          ? Number(emailSettings.smtpPort)
          : undefined,
        smtpUser: emailSettings.smtpUser
          ? emailSettings.smtpUser.trim()
          : undefined,
        smtpPass: emailSettings.smtpPass ? emailSettings.smtpPass : undefined,
        resendApiKey: emailSettings.resendApiKey
          ? emailSettings.resendApiKey.trim()
          : undefined,
        sendgridApiKey: emailSettings.sendgridApiKey
          ? emailSettings.sendgridApiKey.trim()
          : undefined,
      };

      await updateSettingsMutation.mutateAsync(payload);
      toast.success(t("email.settingsSavedSuccess"));
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, t, "email.settingsSaveError");
      toast.error(msg);
    }
  };

  const handleSendTest = async () => {
    const to = testEmailAddress.trim();
    if (!to) return;
    try {
      await sendTestMutation.mutateAsync(to);
      toast.success(t("email.testSentSuccess"));
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, t, "email.testSentError");
      toast.error(msg);
    }
  };

  const isSendingTest = sendTestMutation.isPending;

  return (
    <div className="space-y-5 w-full min-w-0">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Provider Selection */}
        <div className="xl:col-span-7 w-full rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 min-w-0">
          <div className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
              <Sliders className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("email.providerTitle")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("email.providerDesc")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: "SIMULATED",
                title: t("email.providerSimulated"),
                desc: t("email.providerSimulatedDesc"),
                badge: t("email.badgeDevTest"),
              },
              {
                id: "SMTP",
                title: t("email.providerSmtp"),
                desc: t("email.providerSmtpDesc"),
                badge: t("email.badgeEnterprise"),
              },
              {
                id: "RESEND",
                title: t("email.providerResend"),
                desc: t("email.providerResendDesc"),
              },
              {
                id: "SENDGRID",
                title: t("email.providerSendGrid"),
                desc: t("email.providerSendGridDesc"),
              },
            ].map((prov) => (
              <button
                key={prov.id}
                type="button"
                onClick={() =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    provider: prov.id as EmailProviderType,
                  }))
                }
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  emailSettings.provider === prov.id
                    ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-600/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {prov.title}
                  </span>
                  {prov.badge && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {prov.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {prov.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Sender Server Info */}
          <h3 className="text-xs font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
            {t("email.senderServerInfo")}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t("email.senderName")}
              </label>
              <Input
                value={emailSettings.fromName ?? ""}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    fromName: e.target.value,
                  }))
                }
                placeholder={t("email.senderNamePlaceholder")}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t("email.senderEmail")}
              </label>
              <Input
                value={emailSettings.fromEmail ?? ""}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    fromEmail: e.target.value,
                  }))
                }
                placeholder="careers@nexus.com"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Specific fields for SMTP */}
          {emailSettings.provider === "SMTP" && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    {t("email.smtpHost")}
                  </label>
                  <Input
                    value={emailSettings.smtpHost ?? ""}
                    onChange={(e) =>
                      setEmailSettings((prev) => ({
                        ...prev,
                        smtpHost: e.target.value,
                      }))
                    }
                    placeholder={t("email.smtpHostPlaceholder")}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    {t("email.smtpPort")}
                  </label>
                  <Input
                    type="number"
                    value={emailSettings.smtpPort ?? 587}
                    onChange={(e) =>
                      setEmailSettings((prev) => ({
                        ...prev,
                        smtpPort: parseInt(e.target.value, 10) || 587,
                      }))
                    }
                    placeholder="587"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    {t("email.smtpUsername")}
                  </label>
                  <Input
                    value={emailSettings.smtpUser ?? ""}
                    onChange={(e) =>
                      setEmailSettings((prev) => ({
                        ...prev,
                        smtpUser: e.target.value,
                      }))
                    }
                    placeholder="user@example.com"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    {t("email.smtpPassword")}
                  </label>
                  <Input
                    type="password"
                    value={emailSettings.smtpPass ?? ""}
                    onChange={(e) =>
                      setEmailSettings((prev) => ({
                        ...prev,
                        smtpPass: e.target.value,
                      }))
                    }
                    placeholder="••••••••••••"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Specific fields for Resend */}
          {emailSettings.provider === "RESEND" && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t("email.resendApiKeyLabel")}
              </label>
              <Input
                type="password"
                value={emailSettings.resendApiKey ?? ""}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    resendApiKey: e.target.value,
                  }))
                }
                placeholder="re_••••••••••••••••••••••••"
                className="h-9 text-xs font-mono"
              />
            </div>
          )}

          {/* Specific fields for SendGrid */}
          {emailSettings.provider === "SENDGRID" && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t("email.sendgridApiKeyLabel")}
              </label>
              <Input
                type="password"
                value={emailSettings.sendgridApiKey ?? ""}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    sendgridApiKey: e.target.value,
                  }))
                }
                placeholder="SG.••••••••••••••••••••••••"
                className="h-9 text-xs font-mono"
              />
            </div>
          )}

          <div className="pt-3">
            <Button
              type="button"
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
              className="w-full sm:w-auto h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>
                {updateSettingsMutation.isPending
                  ? t("common.saving")
                  : t("email.saveSettingsBtn")}
              </span>
            </Button>
          </div>
        </div>

        {/* Test Email Box */}
        <div className="xl:col-span-5 xl:sticky xl:top-6 w-full rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 min-w-0">
          <div className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
              <Send className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("email.testEmailSection")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("email.testEmailDesc")}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-center xl:items-stretch gap-3">
            <Input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder={t("email.testEmailPlaceholder")}
              className="h-9 text-xs flex-1"
            />
            <Button
              type="button"
              onClick={handleSendTest}
              disabled={isSendingTest || !testEmailAddress.trim()}
              className="w-full sm:w-auto xl:w-full h-9 px-4 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {isSendingTest ? t("email.sendingBtn") : t("email.sendTestBtn")}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
