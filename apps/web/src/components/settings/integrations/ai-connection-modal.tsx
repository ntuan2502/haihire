"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import {
  AI_PROVIDERS,
  AI_PROVIDER_PRESETS,
  type AiConnectionResponse,
  type AiProvider,
} from "@haihire/shared";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  PlugZap,
} from "lucide-react";
import { CustomSelect, FormModal } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateAiConnectionMutation,
  useTestAiConnectionMutation,
  useUpdateAiConnectionMutation,
} from "@/hooks/use-ai-setting-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { buildProviderModelOptions } from "./ai-provider-ui";

export interface AiConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingConnection: AiConnectionResponse | null;
}

export function AiConnectionModal({
  isOpen,
  onClose,
  editingConnection,
}: AiConnectionModalProps) {
  const { t } = useI18n();
  const nameInputId = useId();
  const modelSelectId = useId();
  const baseUrlInputId = useId();
  const apiKeyInputId = useId();

  const createMutation = useCreateAiConnectionMutation();
  const updateMutation = useUpdateAiConnectionMutation();
  const testMutation = useTestAiConnectionMutation();

  const [name, setName] = useState("");
  const [provider, setProvider] = useState<AiProvider>("GEMINI");
  const [modelId, setModelId] = useState<string>(
    AI_PROVIDER_PRESETS.GEMINI.defaultModelId,
  );
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setTestResult(null);
    setShowApiKey(false);

    if (editingConnection) {
      setName(editingConnection.name);
      setProvider(editingConnection.provider);
      setModelId(editingConnection.defaultModelId);
      setBaseUrl(editingConnection.baseUrl || "");
      setApiKey("");
      setIsEnabled(editingConnection.isEnabled);
      setShowAdvanced(
        Boolean(editingConnection.baseUrl) ||
          editingConnection.provider === "OPENAI_COMPATIBLE",
      );
    } else {
      setName("");
      setProvider("GEMINI");
      setModelId(AI_PROVIDER_PRESETS.GEMINI.defaultModelId);
      setBaseUrl("");
      setApiKey("");
      setIsEnabled(true);
      setShowAdvanced(false);
    }
  }, [isOpen, editingConnection]);

  const activePreset = AI_PROVIDER_PRESETS[provider];
  const isCustomProvider = provider === "OPENAI_COMPATIBLE";
  const hasStoredKeyForProvider = Boolean(
    editingConnection?.hasApiKey && editingConnection.provider === provider,
  );

  const modelOptions = useMemo(
    () =>
      buildProviderModelOptions(
        provider,
        t,
        editingConnection?.provider === provider
          ? editingConnection.defaultModelId
          : null,
      ),
    [provider, t, editingConnection],
  );

  const handleSelectProvider = (nextProvider: AiProvider) => {
    if (nextProvider === provider) return;
    setProvider(nextProvider);
    const nextPreset = AI_PROVIDER_PRESETS[nextProvider];
    setModelId(nextPreset.defaultModelId);
    setBaseUrl(
      nextProvider === "OPENAI_COMPATIBLE"
        ? nextPreset.defaultBaseUrl || ""
        : "",
    );
    setApiKey("");
    setTestResult(null);
    if (nextProvider === "OPENAI_COMPATIBLE") {
      setShowAdvanced(true);
    }
  };

  const canTestOrSave =
    name.trim().length > 0 &&
    modelId.trim().length > 0 &&
    (!isCustomProvider || baseUrl.trim().length > 0) &&
    (isCustomProvider || apiKey.trim().length > 0 || hasStoredKeyForProvider);

  const canTestConnection =
    modelId.trim().length > 0 &&
    (!isCustomProvider || baseUrl.trim().length > 0) &&
    (isCustomProvider || apiKey.trim().length > 0 || hasStoredKeyForProvider);

  const handleTestConnection = async () => {
    setTestResult(null);
    setFormError(null);
    try {
      const res = await testMutation.mutateAsync({
        ...(editingConnection ? { connectionId: editingConnection.id } : {}),
        provider,
        modelId: modelId.trim(),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        baseUrl: baseUrl.trim() ? baseUrl.trim() : null,
      });
      const msg = t("settings.integrations.ai.testSuccess", {
        model: res.model,
        latencyMs: res.latencyMs,
      });
      setTestResult({ ok: true, message: msg });
      toast.success(msg);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, t, "errors.AI_CONNECTION_FAILED");
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const trimmedBaseUrl = baseUrl.trim();
      if (editingConnection) {
        await updateMutation.mutateAsync({
          id: editingConnection.id,
          data: {
            name: name.trim(),
            provider,
            defaultModelId: modelId.trim(),
            ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
            baseUrl: trimmedBaseUrl ? trimmedBaseUrl : null,
            isEnabled,
          },
        });
        toast.success(t("settings.integrations.ai.connectionUpdated"));
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          provider,
          defaultModelId: modelId.trim(),
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          baseUrl: trimmedBaseUrl ? trimmedBaseUrl : null,
          isEnabled,
        });
        toast.success(t("settings.integrations.ai.connectionCreated"));
      }
      onClose();
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        editingConnection
          ? t("settings.integrations.ai.editConnectionTitle")
          : t("settings.integrations.ai.createConnectionTitle")
      }
      description={t("settings.integrations.ai.connectionDesc")}
      size="lg"
      isSubmitting={isPending}
      submitDisabled={!canTestOrSave}
      submitLabel={
        editingConnection
          ? t("common.saveChanges")
          : t("settings.integrations.ai.createConnectionButton")
      }
      error={formError}
      footerLeft={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={!canTestConnection || testMutation.isPending}
          className="h-9 text-xs gap-1.5 cursor-pointer"
        >
          {testMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {testMutation.isPending
            ? t("settings.integrations.ai.testingButton")
            : t("settings.integrations.ai.testButton")}
        </Button>
      }
    >
      {/* Connection Name */}
      <div className="space-y-1.5">
        <label
          htmlFor={nameInputId}
          className="block text-xs font-medium text-foreground"
        >
          {t("settings.integrations.ai.connectionNameLabel")}
        </label>
        <Input
          id={nameInputId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("settings.integrations.ai.connectionNamePlaceholder")}
          maxLength={80}
          className="h-9 text-xs bg-background"
        />
      </div>

      {/* Provider Grid */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-foreground">
          {t("settings.integrations.ai.providerTitle")}
        </div>
        <div
          role="radiogroup"
          aria-label={t("settings.integrations.ai.providerTitle")}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
        >
          {AI_PROVIDERS.map((provId) => {
            const preset = AI_PROVIDER_PRESETS[provId];
            const isSelected = provider === provId;
            return (
              <button
                key={provId}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectProvider(provId)}
                className={cn(
                  "text-left p-2.5 rounded-lg border transition-colors space-y-1 cursor-pointer flex flex-col justify-between",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-background hover:border-foreground/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {preset.label}
                  </span>
                  {isSelected && (
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t(`settings.integrations.ai.providers.${provId}_DESC`)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Default Model Selector */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={`${modelSelectId}-trigger`}
            className="text-xs font-medium text-foreground"
          >
            {t("settings.integrations.ai.modelTitle")}
          </label>
          {activePreset.modelsUrl && (
            <a
              href={activePreset.modelsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
            >
              <span>{t("settings.integrations.ai.browseModelsLink")}</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
        <CustomSelect
          id={modelSelectId}
          searchable
          value={modelId}
          onChange={(val) => {
            if (val) setModelId(val);
          }}
          options={modelOptions}
          searchPlaceholder={t(
            "settings.integrations.ai.modelSearchPlaceholder",
          )}
          aria-label={t("settings.integrations.ai.modelTitle")}
          className="w-full"
        />
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <label
            htmlFor={apiKeyInputId}
            className="text-xs font-medium text-foreground"
          >
            {t("settings.integrations.ai.apiKeyLabel")}
            {hasStoredKeyForProvider ? (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                ({t("settings.integrations.ai.apiKeyKeepHint")}
                {editingConnection?.apiKeyLast4
                  ? ` ••••${editingConnection.apiKeyLast4}`
                  : ""}
                )
              </span>
            ) : isCustomProvider ? (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                ({t("settings.integrations.ai.apiKeyOptionalHint")})
              </span>
            ) : null}
          </label>

          <a
            href={activePreset.apiKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
          >
            <span>{t("settings.integrations.ai.getKeyLink")}</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>

        <div className="relative">
          <Input
            id={apiKeyInputId}
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              hasStoredKeyForProvider
                ? `••••••••••••••••${editingConnection?.apiKeyLast4 || ""}`
                : t("settings.integrations.ai.apiKeyPlaceholder")
            }
            className="h-9 text-xs bg-background pr-10 font-mono"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowApiKey((prev) => !prev)}
            aria-label={t("settings.integrations.ai.apiKeyLabel")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {showApiKey ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Base URL: Required directly for OPENAI_COMPATIBLE, collapsible disclosure otherwise */}
      {isCustomProvider ? (
        <div className="space-y-1.5">
          <label
            htmlFor={baseUrlInputId}
            className="block text-xs font-medium text-foreground"
          >
            {t("settings.integrations.ai.baseUrlLabel")}
          </label>
          <Input
            id={baseUrlInputId}
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={t("settings.integrations.ai.baseUrlPlaceholder")}
            className="h-9 text-xs bg-background font-mono"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showAdvanced && "rotate-180",
              )}
              aria-hidden="true"
            />
            <span>{t("settings.integrations.ai.advancedGatewayToggle")}</span>
          </button>

          {showAdvanced && (
            <div className="space-y-1.5 pl-1">
              <label
                htmlFor={baseUrlInputId}
                className="block text-xs font-medium text-foreground"
              >
                {t("settings.integrations.ai.baseUrlLabel")}
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  ({t("settings.integrations.ai.baseUrlOptionalHint")})
                </span>
              </label>
              <Input
                id={baseUrlInputId}
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={t("settings.integrations.ai.baseUrlPlaceholder")}
                className="h-9 text-xs bg-background font-mono"
              />
            </div>
          )}
        </div>
      )}

      {/* Inline Connection Status */}
      {testResult && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs font-medium",
            testResult.ok
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          {testResult.message}
        </div>
      )}
    </FormModal>
  );
}
