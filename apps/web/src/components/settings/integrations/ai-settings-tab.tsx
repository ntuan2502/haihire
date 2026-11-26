"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import {
  AI_PROVIDERS,
  AI_PROVIDER_PRESETS,
  type AiProvider,
} from "@haihire/shared";
import {
  Brain,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlugZap,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  ConfirmDestructiveModal,
  CustomSelect,
  LoadingSpinner,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAiSettingQuery,
  useDeleteAiSettingMutation,
  useTestAiConnectionMutation,
  useUpsertAiSettingMutation,
} from "@/hooks/use-ai-setting-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function AiSettingsTab() {
  const { t } = useI18n();
  const baseUrlInputId = useId();
  const apiKeyInputId = useId();
  const modelSelectId = useId();

  const { data: setting, isLoading } = useAiSettingQuery();
  const upsertMutation = useUpsertAiSettingMutation();
  const deleteMutation = useDeleteAiSettingMutation();
  const testMutation = useTestAiConnectionMutation();

  const [provider, setProvider] = useState<AiProvider>("GEMINI");
  const [modelId, setModelId] = useState<string>(
    AI_PROVIDER_PRESETS.GEMINI.defaultModelId,
  );
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const syncKey = setting
      ? `${setting.id}:${setting.updatedAt}`
      : setting === null
        ? "none"
        : null;
    if (!syncKey || syncKey === hydratedKey) return;

    if (setting) {
      setProvider(setting.provider);
      setModelId(setting.modelId);
      setBaseUrl(setting.baseUrl || "");
      setIsEnabled(setting.isEnabled);
      setApiKey("");
    }
    setHydratedKey(syncKey);
  }, [setting, hydratedKey]);

  const activePreset = AI_PROVIDER_PRESETS[provider];
  const hasStoredKeyForProvider = Boolean(
    setting?.hasApiKey && setting.provider === provider,
  );
  const isCustomProvider = provider === "OPENAI_COMPATIBLE";

  const modelOptions = useMemo(() => {
    const recommendedGroup = t(
      "settings.integrations.ai.modelGroupRecommended",
    );
    const otherGroup = t("settings.integrations.ai.modelGroupOther");

    const featured = activePreset.models.map((m) => {
      const badgeLabel = m.badge
        ? t(`settings.integrations.ai.badges.${m.badge}`)
        : "";
      return {
        value: m.id,
        group: recommendedGroup,
        keywords: `${m.label} ${m.id} ${badgeLabel}`.trim(),
        label: (
          <span className="flex items-center justify-between gap-2 w-full min-w-0">
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-medium text-foreground truncate">
                {m.label}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground truncate">
                {m.id}
              </span>
            </span>
            {m.badge && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                  m.badge === "recommended" && "bg-primary/10 text-primary",
                  m.badge === "fast" &&
                    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  m.badge === "powerful" &&
                    "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                  m.badge === "low_cost" &&
                    "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                )}
              >
                {badgeLabel}
              </span>
            )}
          </span>
        ),
      };
    });

    const others = activePreset.otherModels.map((m) => ({
      value: m.id,
      group: otherGroup,
      keywords: `${m.label} ${m.id}`,
      label: (
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="font-medium text-foreground truncate">
            {m.label}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground truncate">
            {m.id}
          </span>
        </span>
      ),
    }));

    if (
      setting?.provider === provider &&
      setting.modelId &&
      !activePreset.models.some((m) => m.id === setting.modelId) &&
      !activePreset.otherModels.some((m) => m.id === setting.modelId)
    ) {
      others.unshift({
        value: setting.modelId,
        group: otherGroup,
        keywords: setting.modelId,
        label: (
          <span className="font-mono text-foreground truncate">
            {setting.modelId}
          </span>
        ),
      });
    }

    return [...featured, ...others];
  }, [activePreset, provider, setting, t]);

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
  };

  const canTestOrSave =
    modelId.trim().length > 0 &&
    (!isCustomProvider || baseUrl.trim().length > 0) &&
    (isCustomProvider || apiKey.trim().length > 0 || hasStoredKeyForProvider);

  const handleTestConnection = async () => {
    setTestResult(null);
    try {
      const res = await testMutation.mutateAsync({
        provider,
        modelId: modelId.trim(),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        baseUrl: isCustomProvider ? baseUrl.trim() : null,
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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await upsertMutation.mutateAsync({
        provider,
        modelId: modelId.trim(),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        baseUrl: isCustomProvider ? baseUrl.trim() : null,
        isEnabled,
      });
      setApiKey("");
      toast.success(t("settings.integrations.ai.saveSuccess"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      setIsDeleteModalOpen(false);
      setProvider("GEMINI");
      setModelId(AI_PROVIDER_PRESETS.GEMINI.defaultModelId);
      setApiKey("");
      setBaseUrl("");
      setIsEnabled(true);
      setTestResult(null);
      toast.success(t("settings.integrations.ai.deleteSuccess"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  if (isLoading && !hydratedKey) {
    return <LoadingSpinner />;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Brain className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("settings.integrations.ai.title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {t("settings.integrations.ai.description")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <span className="text-xs font-medium text-foreground">
            {t("settings.integrations.ai.enabledLabel")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            aria-label={t("settings.integrations.ai.enabledLabel")}
            onClick={() => setIsEnabled((prev) => !prev)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer",
              isEnabled ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-xs transition-transform",
                isEnabled ? "translate-x-4" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>

      {/* Card 1: Provider */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-foreground">
            {t("settings.integrations.ai.providerTitle")}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("settings.integrations.ai.providerDesc")}
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label={t("settings.integrations.ai.providerTitle")}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3"
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
                  "text-left p-3.5 rounded-xl border transition-colors space-y-1.5 cursor-pointer flex flex-col justify-between",
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

      {/* Card 2: Model */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              {t("settings.integrations.ai.modelTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("settings.integrations.ai.modelDesc")}
            </p>
          </div>

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
          className="w-full max-w-xl"
        />
      </div>

      {/* Card 3: Connection & API Key */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-foreground">
            {t("settings.integrations.ai.connectionTitle")}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("settings.integrations.ai.connectionDesc")}
          </p>
        </div>

        {isCustomProvider && (
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
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={apiKeyInputId}
              className="text-xs font-medium text-foreground"
            >
              {t("settings.integrations.ai.apiKeyLabel")}
              {hasStoredKeyForProvider ? (
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  ({t("settings.integrations.ai.apiKeyKeepHint")}
                  {setting?.apiKeyLast4 ? ` ••••${setting.apiKeyLast4}` : ""})
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
                  ? `••••••••••••••••${setting?.apiKeyLast4 || ""}`
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={!canTestOrSave || testMutation.isPending}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            {testMutation.isPending ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {testMutation.isPending
              ? t("settings.integrations.ai.testingButton")
              : t("settings.integrations.ai.testButton")}
          </Button>

          {testResult && (
            <span
              className={cn(
                "text-xs font-medium",
                testResult.ok
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive",
              )}
            >
              {testResult.message}
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions & Security Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{t("settings.integrations.ai.securityNote")}</span>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {setting && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={deleteMutation.isPending}
              className="h-9 text-xs gap-1.5 text-destructive hover:text-destructive cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t("settings.integrations.ai.deleteButton")}
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!canTestOrSave || upsertMutation.isPending}
            className="h-9 px-5 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            {upsertMutation.isPending ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t("settings.integrations.ai.saveButton")}
          </Button>
        </div>
      </div>

      <ConfirmDestructiveModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={t("settings.integrations.ai.deleteConfirmTitle")}
        description={t("settings.integrations.ai.deleteConfirmMessage")}
        confirmButtonLabel={t("settings.integrations.ai.deleteButton")}
        cancelButtonLabel={t("common.cancel")}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </form>
  );
}
