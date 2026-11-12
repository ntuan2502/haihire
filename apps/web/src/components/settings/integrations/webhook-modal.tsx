"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n";
import type {
  WebhookSettingResponse,
  WebhookEventType,
  WebhookProviderType,
} from "@haihire/shared";
import { Send, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CustomModal,
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared";
import { toast } from "sonner";

export interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSetting: WebhookSettingResponse | null;
  onSave: (payload: {
    eventType: WebhookEventType;
    provider: WebhookProviderType;
    webhookUrl: string;
    secretToken?: string;
    chatId?: string;
    isEnabled: boolean;
    id?: string;
  }) => Promise<void>;
  onTest: (payload: {
    eventType: WebhookEventType;
    provider: WebhookProviderType;
    webhookUrl: string;
    secretToken?: string;
    chatId?: string;
    id?: string;
  }) => Promise<void>;
  isSaving: boolean;
  isTesting: boolean;
}

export function WebhookModal({
  isOpen,
  onClose,
  editingSetting,
  onSave,
  onTest,
  isSaving,
  isTesting,
}: WebhookModalProps) {
  const { t } = useI18n();

  const [eventType, setEventType] = useState<WebhookEventType>("DLQ_ALERT");
  const [provider, setProvider] = useState<WebhookProviderType>("TELEGRAM");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secretToken, setSecretToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (editingSetting) {
      setEventType(editingSetting.eventType);
      setProvider(editingSetting.provider);
      setWebhookUrl(editingSetting.webhookUrl);
      setSecretToken(editingSetting.secretToken || "");
      setChatId(editingSetting.chatId || "");
      setIsEnabled(editingSetting.isEnabled);
    } else {
      setEventType("DLQ_ALERT");
      setProvider("TELEGRAM");
      setWebhookUrl("");
      setSecretToken("");
      setChatId("");
      setIsEnabled(true);
    }
  }, [editingSetting, isOpen]);

  const eventTypeOptions: CustomSelectOption<WebhookEventType>[] = [
    {
      value: "DLQ_ALERT",
      label: t("settings.integrations.webhooks.eventTypes.DLQ_ALERT"),
    },
    {
      value: "ORPHAN_SPIKE",
      label: t("settings.integrations.webhooks.eventTypes.ORPHAN_SPIKE"),
    },
    {
      value: "JOB_POSTED",
      label: t("settings.integrations.webhooks.eventTypes.JOB_POSTED"),
    },
  ];

  const providerOptions: CustomSelectOption<WebhookProviderType>[] = [
    {
      value: "TELEGRAM",
      label: t("settings.integrations.webhooks.providers.TELEGRAM"),
    },
    {
      value: "DISCORD",
      label: t("settings.integrations.webhooks.providers.DISCORD"),
    },
    {
      value: "GENERIC",
      label: t("settings.integrations.webhooks.providers.GENERIC"),
    },
  ];

  const getDynamicPlaceholder = (p: WebhookProviderType) => {
    switch (p) {
      case "TELEGRAM":
        return "https://api.telegram.org/bot<token>/sendMessage";
      case "DISCORD":
        return "https://discord.com/api/webhooks/<id>/<token>";
      case "GENERIC":
        return "https://example.com/api/webhooks";
    }
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast.error(t("errors.VALIDATION_ERROR"));
      return;
    }

    await onSave({
      id: editingSetting?.id,
      eventType,
      provider,
      webhookUrl,
      secretToken: provider === "GENERIC" ? secretToken : undefined,
      chatId: provider === "TELEGRAM" ? chatId : undefined,
      isEnabled,
    });
  };

  const handleTest = async () => {
    await onTest({
      id: editingSetting?.id,
      eventType,
      provider,
      webhookUrl,
      secretToken: provider === "GENERIC" ? secretToken : undefined,
      chatId: provider === "TELEGRAM" ? chatId : undefined,
    });
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingSetting
          ? t("settings.integrations.webhooks.modal.editTitle")
          : t("settings.integrations.webhooks.modal.addTitle")
      }
      size="md"
    >
      <div className="flex flex-col">
        <div className="p-6 space-y-4">
          {/* Event Type Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("settings.integrations.webhooks.modal.eventType")}
            </label>
            <CustomSelect<WebhookEventType>
              value={eventType}
              onChange={(val) => setEventType(val)}
              options={eventTypeOptions}
              className="w-full"
            />
          </div>

          {/* Provider Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("settings.integrations.webhooks.modal.provider")}
            </label>
            <CustomSelect<WebhookProviderType>
              value={provider}
              onChange={(val) => setProvider(val)}
              options={providerOptions}
              className="w-full"
            />
          </div>

          {/* Webhook URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("settings.integrations.webhooks.modal.webhookUrl")}
            </label>
            <Input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={getDynamicPlaceholder(provider)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
              <HelpCircle className="h-3.5 w-3.5 shrink-0" />
              {provider === "TELEGRAM" &&
                t(
                  "settings.integrations.webhooks.modal.webhookUrlHint.telegram",
                )}
              {provider === "DISCORD" &&
                t(
                  "settings.integrations.webhooks.modal.webhookUrlHint.discord",
                )}
              {provider === "GENERIC" &&
                t(
                  "settings.integrations.webhooks.modal.webhookUrlHint.generic",
                )}
            </p>
          </div>

          {/* Telegram Chat ID (Conditional) */}
          {provider === "TELEGRAM" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("settings.integrations.webhooks.modal.chatId")}
              </label>
              <Input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-100123456789"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("settings.integrations.webhooks.modal.chatIdHint")}
              </p>
            </div>
          )}

          {/* Generic Secret Token (Conditional) */}
          {provider === "GENERIC" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("settings.integrations.webhooks.modal.secretToken")}
              </label>
              <Input
                type="password"
                value={secretToken}
                onChange={(e) => setSecretToken(e.target.value)}
                placeholder="••••••••••••••••"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("settings.integrations.webhooks.modal.secretTokenHint")}
              </p>
            </div>
          )}

          {/* Is Enabled Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="webhook-is-enabled"
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="webhook-is-enabled"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none cursor-pointer"
            >
              {t("settings.integrations.webhooks.modal.isEnabled")}
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#202020] shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isTesting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {t("settings.integrations.webhooks.modal.testingButton")}
                </span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>
                  {t("settings.integrations.webhooks.modal.testButton")}
                </span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {t("settings.integrations.webhooks.modal.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>
                    {t("settings.integrations.webhooks.modal.saving")}
                  </span>
                </>
              ) : (
                <span>{t("settings.integrations.webhooks.modal.save")}</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </CustomModal>
  );
}
