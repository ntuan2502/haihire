"use client";

import {
  Save,
  Upload,
  Building2,
  AlertTriangle,
  Trash2,
  Globe,
  ExternalLink,
} from "lucide-react";
import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsReadOnlyBanner } from "@/components/settings/settings-read-only-banner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ALLOWED_ORG_LOGO_MIME_TYPES,
  MAX_ORG_LOGO_SIZE_BYTES,
} from "@haihire/shared";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useMyOrg,
  useUpdateMyOrgMutation,
  useDeleteMyOrgMutation,
  useUploadOrgLogoMutation,
  useDeleteOrgLogoMutation,
} from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import {
  ConfirmDestructiveModal,
  OrganizationLogo,
  PageHeader,
  StatusState,
} from "@/components/shared";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";

export default function GeneralSettingsPage() {
  const router = useRouter();
  const { user, updateUserOrg, refreshUser, isOwner } = useAuth();
  const canView = useHasPermission("org:view");
  const canEdit = useHasPermission("org:update");
  const { t } = useI18n();
  const { data: org, isLoading: isOrgLoading } = useMyOrg({
    enabled: canView,
  });
  const updateOrgMutation = useUpdateMyOrgMutation();
  const deleteOrgMutation = useDeleteMyOrgMutation();
  const uploadLogoMutation = useUploadOrgLogoMutation();
  const deleteLogoMutation = useDeleteOrgLogoMutation();
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const savedOrg = org ?? user?.organization;

  // Form states
  const [orgName, setOrgName] = useState(() => savedOrg?.name || "");
  const [orgSlug, setOrgSlug] = useState(() => savedOrg?.slug || "");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [removeLogoModalOpen, setRemoveLogoModalOpen] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isFinalizingDelete, setIsFinalizingDelete] = useState(false);
  const [appHost] = useState(() =>
    typeof window !== "undefined" ? window.location.host : "",
  );

  const displayHost = appHost || "localhost:3000";

  // Sync org data into form state
  useEffect(() => {
    if (org) {
      setOrgName(org.name || "");
      setOrgSlug(org.slug || "");
    } else if (user?.organization) {
      setOrgName(user.organization.name || "");
      setOrgSlug(user.organization.slug || "");
    }
  }, [org, user]);

  const persistedOrgSlug = savedOrg?.slug || "";
  const isLogoMutating =
    uploadLogoMutation.isPending || deleteLogoMutation.isPending;

  const processLogoFile = async (file?: File | null) => {
    if (!file || !canEdit || isLogoMutating) return;

    const normalizedType = file.type.trim().toLowerCase();
    const lowerName = file.name.toLowerCase();
    const hasAllowedExt =
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".webp");
    const isAllowedMime =
      normalizedType.length > 0
        ? ALLOWED_ORG_LOGO_MIME_TYPES.includes(
            normalizedType as (typeof ALLOWED_ORG_LOGO_MIME_TYPES)[number],
          )
        : hasAllowedExt;

    if (!isAllowedMime || !hasAllowedExt) {
      toast.error(t("settings.logo.invalidTypeError"));
      return;
    }

    if (file.size > MAX_ORG_LOGO_SIZE_BYTES) {
      toast.error(t("settings.logo.fileTooLargeError"));
      return;
    }

    try {
      const updated = await uploadLogoMutation.mutateAsync(file);
      if (updated) {
        updateUserOrg(updated);
      }
      toast.success(t("settings.logo.uploadSuccess"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const handleLogoInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    await processLogoFile(file);
  };

  const handleLogoDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    if (!canEdit) return;
    const file = e.dataTransfer.files?.[0];
    await processLogoFile(file);
  };

  const handleRemoveLogo = async () => {
    if (!canEdit || isLogoMutating) return;
    try {
      const updated = await deleteLogoMutation.mutateAsync();
      if (updated) {
        updateUserOrg(updated);
      }
      setRemoveLogoModalOpen(false);
      toast.success(t("settings.logo.removeSuccess"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t));
    }
  };
  const hasProfileChanges =
    orgName.trim() !== (savedOrg?.name ?? "") ||
    orgSlug.trim().toLowerCase() !== (savedOrg?.slug ?? "");
  const canSaveProfile =
    canEdit &&
    !isOrgLoading &&
    !updateOrgMutation.isPending &&
    hasProfileChanges;

  // Handle saving organization profile
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSaveProfile) return;

    const trimmedName = orgName.trim();
    const trimmedSlug = orgSlug.toLowerCase().trim();

    if (!trimmedName) {
      toast.error(t("settings.orgNameRequiredError"));
      return;
    }
    if (!trimmedSlug) {
      toast.error(t("settings.orgSlugRequiredError"));
      return;
    }

    try {
      const updated = await updateOrgMutation.mutateAsync({
        name: trimmedName,
        slug: trimmedSlug,
      });

      if (updated) {
        updateUserOrg(updated);
      }

      toast.success(t("common.save"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  // Handle deleting organization
  const handleDeleteOrg = async () => {
    setIsFinalizingDelete(true);
    try {
      await deleteOrgMutation.mutateAsync();
      await refreshUser();
      setDeleteModalOpen(false);
      router.replace("/auth/onboarding");
    } catch (err) {
      console.error("Failed to delete organization:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsFinalizingDelete(false);
    }
  };

  if (!canView) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-200">
        <PageHeader
          title={t("settings.tabs.general")}
          subtitle={t("settings.tabs.generalSub")}
          icon={Building2}
          bordered
        />
        <StatusState
          status="403"
          variant="card"
          actionLabel={t("nav.dashboard")}
          actionHref="/dashboard"
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.tabs.general")}
        subtitle={t("settings.tabs.generalSub")}
        icon={Building2}
        bordered
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* CARD 1: Organization profile */}
        <SettingsCard className="xl:col-span-7 space-y-5">
          {/* Card Header */}
          <div className="flex items-start gap-3 pb-4 border-b border-border">
            <OrganizationLogo
              name={savedOrg?.name}
              logoUrl={savedOrg?.logoUrl}
              size="lg"
              decorative
            />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t("settings.tabs.generalSub")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.generalProfileDesc")}
              </p>
            </div>
          </div>

          {!canEdit && <SettingsReadOnlyBanner />}

          {/* Organization Logo Management */}
          <div
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setIsDraggingLogo(true);
            }}
            onDragLeave={() => setIsDraggingLogo(false)}
            onDrop={handleLogoDrop}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              isDraggingLogo
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30",
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <OrganizationLogo
                name={savedOrg?.name}
                logoUrl={savedOrg?.logoUrl}
                size="xl"
                className="size-16 rounded-xl text-xl shrink-0"
              />

              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h3 className="text-xs font-semibold text-foreground">
                    {t("settings.logo.title")}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("settings.logo.description")}
                  </p>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label={
                        savedOrg?.logoUrl
                          ? t("settings.logo.changeButton")
                          : t("settings.logo.uploadButton")
                      }
                      onChange={handleLogoInputChange}
                      disabled={isOrgLoading || isLogoMutating}
                      className="sr-only"
                    />
                    <SettingsButton
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Upload}
                      pending={uploadLogoMutation.isPending}
                      disabled={isOrgLoading || isLogoMutating}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadLogoMutation.isPending
                        ? t("settings.logo.uploading")
                        : savedOrg?.logoUrl
                          ? t("settings.logo.changeButton")
                          : t("settings.logo.uploadButton")}
                    </SettingsButton>

                    {savedOrg?.logoUrl && (
                      <SettingsButton
                        type="button"
                        variant="destructive"
                        size="sm"
                        icon={Trash2}
                        pending={deleteLogoMutation.isPending}
                        disabled={isOrgLoading || isLogoMutating}
                        onClick={() => setRemoveLogoModalOpen(true)}
                      >
                        {deleteLogoMutation.isPending
                          ? t("settings.logo.removing")
                          : t("settings.logo.removeButton")}
                      </SettingsButton>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  {t("settings.logo.hint")}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Organization name */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                {t("settings.workspaceName")}
              </label>
              <Input
                type="text"
                placeholder={t("settings.placeholders.orgName")}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="text-xs"
                required
                disabled={
                  !canEdit || isOrgLoading || updateOrgMutation.isPending
                }
              />
            </div>

            {/* URL slug */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                {t("settings.urlSlug")}
              </label>
              <div className="flex items-center rounded-md border border-input bg-transparent dark:bg-input/30 overflow-hidden shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <span
                  suppressHydrationWarning
                  className="px-3 h-9 inline-flex items-center bg-muted text-muted-foreground text-xs font-medium select-none border-r border-input shrink-0"
                >
                  {displayHost}/
                </span>
                <input
                  id="org-slug-input"
                  name="orgSlug"
                  aria-label={t("settings.urlSlug")}
                  type="text"
                  placeholder={t("settings.placeholders.orgSlug")}
                  value={orgSlug}
                  onChange={(e) =>
                    setOrgSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  className="flex-1 h-9 px-3 text-xs bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
                  required
                  disabled={
                    !canEdit || isOrgLoading || updateOrgMutation.isPending
                  }
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {t("settings.slugHint")}
              </p>
            </div>

            {/* Save Button */}
            {canEdit && (
              <div className="pt-2">
                <SettingsButton
                  type="submit"
                  icon={Save}
                  pending={updateOrgMutation.isPending}
                  disabled={!canSaveProfile}
                >
                  {updateOrgMutation.isPending
                    ? t("common.saving")
                    : t("settings.saveChanges")}
                </SettingsButton>
              </div>
            )}
          </form>
        </SettingsCard>

        {/* Right Column: Workspace Careers Portal + Danger zone (Owner only) */}
        <div className="xl:col-span-5 space-y-6">
          <SettingsCard className="space-y-4">
            <div className="flex items-start gap-3 pb-4 border-b border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
                <Globe className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("settings.publicJobBoardLink")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.workspaceSummaryDesc")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground">
                {t("settings.urlSlug")}
              </p>
              <p
                suppressHydrationWarning
                className="text-xs font-mono text-foreground break-all"
              >
                {displayHost}/careers/{orgSlug || "..."}
              </p>
            </div>

            <Link
              href={orgSlug ? `/careers/${orgSlug}` : "/careers"}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-2 text-xs font-semibold",
              )}
            >
              <span>{t("settings.openPublicCareers")}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </SettingsCard>

          {isOwner && (
            <div className="rounded-xl border border-destructive/30 bg-card text-card-foreground p-5 sm:p-6 shadow-xs space-y-4">
              {/* Danger Header */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20 text-destructive shrink-0">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-destructive">
                    {t("settings.dangerZone")}
                  </h2>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    {t("settings.dangerZoneDesc")}
                  </p>
                </div>
              </div>

              <div className="border-t border-destructive/20 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-foreground">
                    {t("settings.deleteOrg")}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("settings.deleteOrgDesc")}
                  </p>
                </div>

                <SettingsButton
                  type="button"
                  variant="destructive"
                  icon={Trash2}
                  onClick={() => setDeleteModalOpen(true)}
                >
                  {t("common.delete")}
                </SettingsButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= DELETE ORGANIZATION CONFIRMATION MODAL ================= */}
      <ConfirmDestructiveModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteOrg}
        title={t("settings.deleteOrg")}
        description={t("settings.dangerZoneDesc")}
        notice={t("settings.deleteOrgConfirmPrompt", {
          slug: persistedOrgSlug,
        })}
        confirmMatchText={persistedOrgSlug}
        confirmButtonLabel={t("settings.deleteOrgButton")}
        cancelButtonLabel={t("common.cancel")}
        isLoading={deleteOrgMutation.isPending || isFinalizingDelete}
        variant="danger"
      />

      {/* ================= REMOVE ORGANIZATION LOGO CONFIRMATION MODAL ================= */}
      <ConfirmDestructiveModal
        isOpen={removeLogoModalOpen}
        onClose={() => setRemoveLogoModalOpen(false)}
        onConfirm={handleRemoveLogo}
        title={t("settings.logo.removeConfirmTitle")}
        description={t("settings.logo.removeConfirmDesc")}
        confirmButtonLabel={t("settings.logo.removeConfirmAction")}
        cancelButtonLabel={t("common.cancel")}
        isLoading={deleteLogoMutation.isPending}
        variant="warning"
      />
    </div>
  );
}
