"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Globe, Trash2, Upload } from "lucide-react";
import {
  ALLOWED_USER_AVATAR_EXTENSIONS,
  ALLOWED_USER_AVATAR_MIME_TYPES,
  MAX_USER_AVATAR_SIZE_BYTES,
  type UserAvatarSource,
} from "@haihire/shared";
import { SettingsButton } from "@/components/settings/settings-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useI18n } from "@/i18n";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { prepareAvatarUploadFile } from "@/lib/avatar-image";
import { toast } from "@/lib/toast";
import { cn } from "cn";
import type { User } from "@/types";

interface AccountAvatarSectionProps {
  user?: User | null;
  displayName: string;
  onUserUpdated: (updatedUser: User) => void;
}

function resolveCurrentSource(user?: User | null): UserAvatarSource {
  if (
    user?.avatarSource === "UPLOAD" ||
    user?.avatarSource === "GRAVATAR" ||
    user?.avatarSource === "NONE"
  ) {
    return user.avatarSource;
  }
  if (!user?.avatarUrl) return "NONE";
  return user.avatarUrl.includes("gravatar.com") ? "GRAVATAR" : "UPLOAD";
}

/**
 * Drag-and-drop photo uploader and Gravatar selector embedded inside the Account Profile card.
 */
export function AccountAvatarSection({
  user,
  displayName,
  onUserUpdated,
}: AccountAvatarSectionProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingSource, setPendingSource] = useState<
    "GRAVATAR" | "NONE" | null
  >(null);
  const [failedGravatarUrl, setFailedGravatarUrl] = useState<string | null>(
    null,
  );

  const currentSource = resolveCurrentSource(user);
  const isMutating = isUploading || pendingSource !== null;
  const hasAvatar = currentSource !== "NONE" || Boolean(user?.avatarUrl);
  const isGravatarMissing =
    currentSource === "GRAVATAR" &&
    Boolean(user?.avatarUrl) &&
    failedGravatarUrl === user?.avatarUrl;

  const sourceLabel =
    currentSource === "UPLOAD"
      ? t("settings.accountAvatar.sourceUpload")
      : currentSource === "GRAVATAR"
        ? t("settings.accountAvatar.sourceGravatar")
        : t("settings.accountAvatar.sourceDefault");

  const processAvatarFile = async (file?: File | null) => {
    if (!file || isMutating) return;

    const normalizedType = file.type.trim().toLowerCase();
    const lowerName = file.name.toLowerCase();
    const hasAllowedExt = ALLOWED_USER_AVATAR_EXTENSIONS.some((ext) =>
      lowerName.endsWith(ext),
    );
    const isAllowedMime =
      normalizedType.length > 0
        ? ALLOWED_USER_AVATAR_MIME_TYPES.includes(
            normalizedType as (typeof ALLOWED_USER_AVATAR_MIME_TYPES)[number],
          )
        : hasAllowedExt;

    if (!isAllowedMime || !hasAllowedExt) {
      toast.error(t("settings.accountAvatar.invalidTypeError"));
      return;
    }

    if (file.size > MAX_USER_AVATAR_SIZE_BYTES) {
      toast.error(t("settings.accountAvatar.fileTooLargeError"));
      return;
    }

    setIsUploading(true);
    try {
      const prepared = await prepareAvatarUploadFile(file);
      const updated = await authApi.uploadAvatar(prepared);
      onUserUpdated(updated);
      toast.success(t("settings.accountAvatar.uploadSuccess"));
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t, "settings.accountAvatar.saveError"),
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    await processAvatarFile(file);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    await processAvatarFile(file);
  };

  const handleSelectSource = async (source: "GRAVATAR" | "NONE") => {
    if (isMutating) return;
    setPendingSource(source);
    try {
      const updated = await authApi.updateAvatarSource(source);
      if (source === "GRAVATAR") {
        setFailedGravatarUrl(null);
      }
      onUserUpdated(updated);
      toast.success(
        t(
          source === "GRAVATAR"
            ? "settings.accountAvatar.gravatarSuccess"
            : "settings.accountAvatar.removeSuccess",
        ),
      );
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t, "settings.accountAvatar.saveError"),
      );
    } finally {
      setPendingSource(null);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-xl border p-4 transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <UserAvatar
          name={displayName}
          avatarUrl={user?.avatarUrl}
          size="xl"
          rounded="full"
          onImageError={() => {
            if (currentSource === "GRAVATAR" && user?.avatarUrl) {
              setFailedGravatarUrl(user.avatarUrl);
            }
          }}
        />

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              {t("settings.accountAvatar.title")}
            </h3>
            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {sourceLabel}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t("settings.accountAvatar.description")}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label={
                currentSource === "UPLOAD"
                  ? t("settings.accountAvatar.changeButton")
                  : t("settings.accountAvatar.uploadButton")
              }
              onChange={handleFileChange}
              disabled={isMutating}
              className="sr-only"
            />
            <SettingsButton
              type="button"
              variant="outline"
              size="sm"
              icon={Upload}
              pending={isUploading}
              disabled={isMutating}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading
                ? t("common.uploading")
                : currentSource === "UPLOAD"
                  ? t("settings.accountAvatar.changeButton")
                  : t("settings.accountAvatar.uploadButton")}
            </SettingsButton>

            <SettingsButton
              type="button"
              variant={currentSource === "GRAVATAR" ? "secondary" : "outline"}
              size="sm"
              icon={Globe}
              pending={pendingSource === "GRAVATAR"}
              disabled={isMutating || currentSource === "GRAVATAR"}
              onClick={() => void handleSelectSource("GRAVATAR")}
            >
              {currentSource === "GRAVATAR"
                ? t("settings.accountAvatar.gravatarActive")
                : t("settings.accountAvatar.useGravatarButton")}
            </SettingsButton>

            {hasAvatar && (
              <SettingsButton
                type="button"
                variant="destructive"
                size="sm"
                icon={Trash2}
                pending={pendingSource === "NONE"}
                disabled={isMutating}
                onClick={() => void handleSelectSource("NONE")}
              >
                {pendingSource === "NONE"
                  ? t("settings.accountAvatar.removing")
                  : t("settings.accountAvatar.removeButton")}
              </SettingsButton>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t("settings.accountAvatar.hint")}
          </p>

          {isGravatarMissing && user?.email && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              {t("settings.accountAvatar.gravatarNotFoundHint", {
                email: user.email,
              })}{" "}
              <a
                href="https://gravatar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:text-foreground"
              >
                {"gravatar.com"}
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
