"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Globe } from "lucide-react";
import {
  getTimezoneSelectOptions,
  normalizeOrgLocalization,
  SUPPORTED_CURRENCIES,
  SUPPORTED_ORG_LANGUAGES,
  type CurrencyCode,
  type OrganizationLocalizationSettings,
  type OrgLanguage,
} from "@haihire/shared";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useMyOrg,
  useUpdateMyOrgMutation,
} from "@/hooks/use-organization-queries";
import { useI18n } from "@/i18n";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { PersonalLanguageCard } from "@/components/settings/localization/personal-language-card";
import { OrgRegionalSettingsForm } from "@/components/settings/localization/org-regional-settings-form";
import { LocalizationPreviewCard } from "@/components/settings/localization/localization-preview-card";

const PREVIEW_DATE_ISO = "2026-08-27T12:00:00.000Z";

function settingsEqual(
  a: OrganizationLocalizationSettings,
  b: OrganizationLocalizationSettings,
): boolean {
  return (
    a.defaultLanguage === b.defaultLanguage &&
    a.timezone === b.timezone &&
    a.dateFormat === b.dateFormat &&
    a.timeFormat === b.timeFormat &&
    a.nameDisplayOrder === b.nameDisplayOrder &&
    a.defaultCurrency === b.defaultCurrency
  );
}

export default function LocalizationSettingsPage() {
  const { user, updateUser } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const canEdit = useHasPermission("org:update");

  const { data: myOrg, isLoading: isOrgLoading } = useMyOrg();
  const updateOrgMutation = useUpdateMyOrgMutation();

  const savedSettings = useMemo(
    () => normalizeOrgLocalization(myOrg ?? user?.organization),
    [myOrg, user?.organization],
  );

  const [draftOverride, setDraftOverride] =
    useState<OrganizationLocalizationSettings | null>(null);

  const draft = draftOverride ?? savedSettings;
  const isDirty = !settingsEqual(draft, savedSettings);

  const updateDraft = <K extends keyof OrganizationLocalizationSettings>(
    key: K,
    value: OrganizationLocalizationSettings[K],
  ) => {
    setDraftOverride((prev) => ({
      ...(prev ?? savedSettings),
      [key]: value,
    }));
  };

  const languageOptions = useMemo(
    () =>
      SUPPORTED_ORG_LANGUAGES.map((lang) => ({
        value: lang,
        label: t(`settings.localization.languages.${lang}`),
      })),
    [t],
  );

  const timezoneOptions = useMemo(
    () => getTimezoneSelectOptions(draft.timezone),
    [draft.timezone],
  );

  const handlePersonalLanguageChange = async (lang: OrgLanguage) => {
    setLocale(lang);
    if (!user) return;
    try {
      const updated = await authApi.updatePreferences({
        preferredLanguage: lang,
      });
      updateUser(updated);
    } catch {
      // Preserve immediate local language switch even if DB preference sync fails
    }
  };

  const currencyOptions = useMemo(() => {
    const getCurrencyLabel = (code: CurrencyCode) => {
      switch (code) {
        case "VND":
          return t("settings.localization.currencies.VND");
        case "USD":
          return t("settings.localization.currencies.USD");
        case "EUR":
          return t("settings.localization.currencies.EUR");
        case "SGD":
          return t("settings.localization.currencies.SGD");
        case "JPY":
          return t("settings.localization.currencies.JPY");
      }
    };

    return SUPPORTED_CURRENCIES.map((code) => ({
      value: code,
      label: getCurrencyLabel(code),
    }));
  }, [t]);

  const [previewRelativeDate] = useState(
    () => new Date(Date.now() - 5 * 60 * 1000),
  );

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit || !isDirty) return;

    try {
      await updateOrgMutation.mutateAsync(draft);
      setDraftOverride(null);
      toast.success(t("settings.localization.saveSuccess"));
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t, "settings.localization.saveError"),
      );
    }
  };

  const handleReset = () => {
    setDraftOverride(null);
  };

  const isDisabled = !canEdit || isOrgLoading || updateOrgMutation.isPending;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.localization.title")}
        subtitle={t("settings.localization.description")}
        icon={Globe}
        bordered
      />

      {/* Main Responsive 2-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-6">
          <PersonalLanguageCard
            locale={locale}
            onLanguageChange={(val) => void handlePersonalLanguageChange(val)}
            languageOptions={languageOptions}
          />

          <OrgRegionalSettingsForm
            draft={draft}
            updateDraft={updateDraft}
            canEdit={canEdit}
            isDisabled={isDisabled}
            isDirty={isDirty}
            isSaving={updateOrgMutation.isPending}
            languageOptions={languageOptions}
            timezoneOptions={timezoneOptions}
            currencyOptions={currencyOptions}
            onSave={handleSave}
            onReset={handleReset}
            previewDateIso={PREVIEW_DATE_ISO}
          />
        </div>

        <LocalizationPreviewCard
          draft={draft}
          previewRelativeDate={previewRelativeDate}
        />
      </div>
    </div>
  );
}
