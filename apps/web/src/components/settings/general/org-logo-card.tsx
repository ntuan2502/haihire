"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Upload, Trash2 } from "lucide-react";
import {
  ALLOWED_ORG_LOGO_MIME_TYPES,
  MAX_ORG_LOGO_SIZE_BYTES,
} from "@haihire/shared";
import { SettingsButton } from "@/components/settings/settings-button";
import { ConfirmDestructiveModal, OrganizationLogo } from "@/components/shared";
import {
  useDeleteOrgLogoMutation,
  useUploadOrgLogoMutation,
} from "@/hooks/use-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Organization } from "@/types";

interface OrgLogoCardProps {
  savedOrg?: Organization | null;
  canEdit: boolean;
  isOrgLoading: boolean;
  onOrgUpdated: (org: Organization) => void;
}

/**
 * Drag-and-drop and click uploader for the organization's workspace logo.
 */
export function OrgLogoCard({
  savedOrg,
  canEdit,
  isOrgLoading,
  onOrgUpdated,
}: OrgLogoCardProps) {
  const { t } = useI18n();
  const uploadLogoMutation = useUploadOrgLogoMutation();
  const deleteLogoMutation = useDeleteOrgLogoMutation();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [removeLogoModalOpen, setRemoveLogoModalOpen] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

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
        onOrgUpdated(updated);
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
        onOrgUpdated(updated);
      }
      setRemoveLogoModalOpen(false);
      toast.success(t("settings.logo.removeSuccess"));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  return (
    <>
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
                    ? t("common.uploading")
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
    </>
  );
}
