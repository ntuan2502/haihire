"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { useState, useEffect, useId, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import type {
  WebhookSettingResponse,
  WebhookEventType,
  WebhookProviderType,
} from "@haihire/shared";
import { Send, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  FormModal,
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared";
import { toast } from "@/lib/toast";

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
  const baseId = useId();
  const eventTypeSelectId = `${baseId}-event`;
  const providerSelectId = `${baseId}-provider`;
  const urlInputId = `${baseId}-url`;
  const chatIdInputId = `${baseId}-chat`;
  const secretInputId = `${baseId}-secret`;
  const enabledCheckboxId = `${baseId}-enabled`;

  const [eventType, setEventType] = useState<WebhookEventType>("DLQ_ALERT");
  const [provider, setProvider] = useState<WebhookProviderType>("TELEGRAM");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secretToken, setSecretToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormError(null);
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

  const isBusy = isSaving || isTesting;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setFormError(null);
    if (!webhookUrl.trim()) {
      const msg = t("errors.VALIDATION_ERROR");
      setFormError(msg);
      toast.error(msg);
      return;
    }

    await onSave({
      id: editingSetting?.id,
      eventType,
      provider,
      webhookUrl: webhookUrl.trim(),
      secretToken: provider === "GENERIC" ? secretToken : undefined,
      chatId: provider === "TELEGRAM" ? chatId : undefined,
      isEnabled,
    });
  };

  const handleTest = async () => {
    if (isBusy) return;
    setFormError(null);
    if (!webhookUrl.trim()) {
      const msg = t("errors.VALIDATION_ERROR");
      setFormError(msg);
      toast.error(msg);
      return;
    }

    await onTest({
      id: editingSetting?.id,
      eventType,
      provider,
      webhookUrl: webhookUrl.trim(),
      secretToken: provider === "GENERIC" ? secretToken : undefined,
      chatId: provider === "TELEGRAM" ? chatId : undefined,
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSave}
      title={
        editingSetting
          ? t("settings.integrations.webhooks.modal.editTitle")
          : t("settings.integrations.webhooks.modal.addTitle")
      }
      size="md"
      isSubmitting={isBusy}
      error={formError}
      bodyClassName="space-y-4"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <SettingsButton
            type="button"
            variant="outline"
            size="sm"
            icon={Send}
            pending={isTesting}
            onClick={handleTest}
            disabled={isBusy}
            className="w-full sm:w-auto"
          >
            {isTesting
              ? t("settings.integrations.webhooks.modal.testingButton")
              : t("settings.integrations.webhooks.modal.testButton")}
          </SettingsButton>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <SettingsButton
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={onClose}
            >
              {t("common.cancel")}
            </SettingsButton>
            <SettingsButton
              type="submit"
              size="sm"
              pending={isSaving}
              disabled={isBusy}
            >
              {isSaving
                ? t("common.saving")
                : t("settings.integrations.webhooks.modal.save")}
            </SettingsButton>
          </div>
        </div>
      }
    >
      {/* Event Type Select */}
      <div className="space-y-1.5">
        <label
          htmlFor={`${eventTypeSelectId}-trigger`}
          className="text-xs font-medium text-foreground block"
        >
          {t("settings.integrations.webhooks.modal.eventType")}
        </label>
        <CustomSelect<WebhookEventType>
          id={eventTypeSelectId}
          value={eventType}
          onChange={(val) => setEventType(val)}
          options={eventTypeOptions}
          disabled={isBusy}
          className="w-full"
        />
      </div>

      {/* Provider Select */}
      <div className="space-y-1.5">
        <label
          htmlFor={`${providerSelectId}-trigger`}
          className="text-xs font-medium text-foreground block"
        >
          {t("settings.integrations.webhooks.modal.provider")}
        </label>
        <CustomSelect<WebhookProviderType>
          id={providerSelectId}
          value={provider}
          onChange={(val) => setProvider(val)}
          options={providerOptions}
          disabled={isBusy}
          className="w-full"
        />
      </div>

      {/* Webhook URL Input */}
      <div className="space-y-1.5">
        <label
          htmlFor={urlInputId}
          className="text-xs font-medium text-foreground block"
        >
          {t("settings.integrations.webhooks.modal.webhookUrl")}
        </label>
        <Input
          id={urlInputId}
          type="text"
          value={webhookUrl}
          disabled={isBusy}
          onChange={(e) => {
            setWebhookUrl(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder={getDynamicPlaceholder(provider)}
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {provider === "TELEGRAM" &&
              t("settings.integrations.webhooks.modal.webhookUrlHint.telegram")}
            {provider === "DISCORD" &&
              t("settings.integrations.webhooks.modal.webhookUrlHint.discord")}
            {provider === "GENERIC" &&
              t("settings.integrations.webhooks.modal.webhookUrlHint.generic")}
          </span>
        </p>
      </div>

      {/* Telegram Chat ID (Conditional) */}
      {provider === "TELEGRAM" && (
        <div className="space-y-1.5">
          <label
            htmlFor={chatIdInputId}
            className="text-xs font-medium text-foreground block"
          >
            {t("settings.integrations.webhooks.modal.chatId")}
          </label>
          <Input
            id={chatIdInputId}
            type="text"
            value={chatId}
            disabled={isBusy}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="-100123456789"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("settings.integrations.webhooks.modal.chatIdHint")}
          </p>
        </div>
      )}

      {/* Generic Secret Token (Conditional) */}
      {provider === "GENERIC" && (
        <div className="space-y-1.5">
          <label
            htmlFor={secretInputId}
            className="text-xs font-medium text-foreground block"
          >
            {t("settings.integrations.webhooks.modal.secretToken")}
          </label>
          <Input
            id={secretInputId}
            type="password"
            value={secretToken}
            disabled={isBusy}
            onChange={(e) => setSecretToken(e.target.value)}
            placeholder="••••••••••••••••"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("settings.integrations.webhooks.modal.secretTokenHint")}
          </p>
        </div>
      )}

      {/* Is Enabled Toggle */}
      <div className="flex items-center gap-2 pt-2">
        <input
          id={enabledCheckboxId}
          type="checkbox"
          checked={isEnabled}
          disabled={isBusy}
          onChange={(e) => setIsEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary focus-visible:ring-ring cursor-pointer disabled:opacity-50"
        />
        <label
          htmlFor={enabledCheckboxId}
          className="text-xs font-medium text-foreground select-none cursor-pointer"
        >
          {t("settings.integrations.webhooks.modal.isEnabled")}
        </label>
      </div>
    </FormModal>
  );
}
