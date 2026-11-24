"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { User as UserIcon } from "lucide-react";
import { cn } from "cn";
import { resolveUserAvatarUrl } from "@/lib/api/client";
import { getInitials } from "@/lib/utils";

export type UserAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  rounded?: "full" | "lg";
  decorative?: boolean;
  className?: string;
  onImageError?: () => void;
  onImageLoad?: () => void;
}

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  xs: "size-5 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-9 text-xs",
  lg: "size-10 text-sm",
  xl: "size-16 text-lg",
};

/**
 * Displays a user's profile image (MinIO proxy or Gravatar) with automatic
 * fallback to initials when no avatar is set or the image fails to load.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  rounded = "full",
  decorative = false,
  className,
  onImageError,
  onImageLoad,
}: UserAvatarProps) {
  const resolvedSrc = resolveUserAvatarUrl(avatarUrl);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const onImageErrorRef = useRef(onImageError);
  const onImageLoadRef = useRef(onImageLoad);
  const reportedErrorSrcRef = useRef<string | null>(null);
  const reportedLoadSrcRef = useRef<string | null>(null);

  useEffect(() => {
    onImageErrorRef.current = onImageError;
    onImageLoadRef.current = onImageLoad;
  }, [onImageError, onImageLoad]);

  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isLoaded = Boolean(resolvedSrc) && loadedSrc === resolvedSrc;
  const shouldRenderImg = Boolean(resolvedSrc) && failedSrc !== resolvedSrc;
  const trimmedName = name?.trim() || "";
  const initials = trimmedName ? getInitials(trimmedName) : "";

  const handleLoadSuccess = useCallback((src: string) => {
    setLoadedSrc((prev) => (prev === src ? prev : src));
    if (reportedLoadSrcRef.current !== src) {
      reportedLoadSrcRef.current = src;
      onImageLoadRef.current?.();
    }
  }, []);

  const handleLoadFailure = useCallback((src: string) => {
    setFailedSrc((prev) => (prev === src ? prev : src));
    if (reportedErrorSrcRef.current !== src) {
      reportedErrorSrcRef.current = src;
      onImageErrorRef.current?.();
    }
  }, []);

  // Catch cached/pre-hydration 404s where img.complete is already true (naturalWidth === 0)
  // without waiting for an error event that may not re-fire.
  useEffect(() => {
    if (!resolvedSrc) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const img = imgRef.current;
      if (!img || !img.complete) return;
      if (img.naturalWidth > 0) {
        handleLoadSuccess(resolvedSrc);
      } else {
        handleLoadFailure(resolvedSrc);
      }
    });
    return () => {
      cancelled = true;
      reportedErrorSrcRef.current = null;
      reportedLoadSrcRef.current = null;
    };
  }, [resolvedSrc, handleLoadFailure, handleLoadSuccess]);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden select-none font-semibold",
        rounded === "lg" ? "rounded-lg" : "rounded-full",
        SIZE_CLASSES[size],
        isLoaded
          ? "bg-muted ring-1 ring-border"
          : "bg-secondary text-secondary-foreground ring-1 ring-border",
        className,
      )}
    >
      {!isLoaded &&
        (initials ? (
          <span aria-hidden="true">{initials}</span>
        ) : (
          <UserIcon className="h-[55%] w-[55%]" aria-hidden="true" />
        ))}
      {shouldRenderImg && (
        <>
          {/* Intentional img element for authenticated proxy & external Gravatar URLs with onError fallback */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={resolvedSrc!}
            alt={decorative ? "" : trimmedName}
            aria-hidden={decorative || undefined}
            onError={() => {
              if (resolvedSrc) handleLoadFailure(resolvedSrc);
            }}
            onLoad={(e) => {
              if (!resolvedSrc) return;
              if (e.currentTarget.naturalWidth > 0) {
                handleLoadSuccess(resolvedSrc);
              } else {
                handleLoadFailure(resolvedSrc);
              }
            }}
            className={cn(
              "h-full w-full object-cover",
              isLoaded
                ? "opacity-100"
                : "opacity-0 absolute inset-0 pointer-events-none",
            )}
          />
        </>
      )}
    </div>
  );
}
