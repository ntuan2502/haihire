"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

const failedAvatarUrls = new Set<string>();

export function clearFailedAvatarUrlCache(): void {
  failedAvatarUrls.clear();
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Displays a user's profile image (MinIO proxy or Gravatar) directly on initial render
 * without an initials flash on reload, falling back to initials if loading fails.
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

  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isKnownFailed =
    Boolean(resolvedSrc) &&
    (failedSrc === resolvedSrc || failedAvatarUrls.has(resolvedSrc!));
  const showImage = Boolean(resolvedSrc) && !isKnownFailed;
  const trimmedName = name?.trim() || "";
  const initials = trimmedName ? getInitials(trimmedName) : "";

  const handleLoadSuccess = useCallback((src: string) => {
    if (reportedLoadSrcRef.current !== src) {
      reportedLoadSrcRef.current = src;
      onImageLoadRef.current?.();
    }
  }, []);

  const handleLoadFailure = useCallback((src: string) => {
    failedAvatarUrls.add(src);
    setFailedSrc((prev) => (prev === src ? prev : src));
    if (reportedErrorSrcRef.current !== src) {
      reportedErrorSrcRef.current = src;
      onImageErrorRef.current?.();
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    return () => {
      reportedErrorSrcRef.current = null;
      reportedLoadSrcRef.current = null;
    };
  }, [resolvedSrc]);

  // Catch cached/pre-hydration 404s synchronously before paint (and notify callers
  // if another component already recorded this URL as failed in the current session).
  useIsomorphicLayoutEffect(() => {
    if (!resolvedSrc) return;

    if (isKnownFailed) {
      if (reportedErrorSrcRef.current !== resolvedSrc) {
        reportedErrorSrcRef.current = resolvedSrc;
        onImageErrorRef.current?.();
      }
      return;
    }

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
    };
  }, [resolvedSrc, isKnownFailed, handleLoadFailure, handleLoadSuccess]);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden select-none font-semibold",
        rounded === "lg" ? "rounded-lg" : "rounded-full",
        SIZE_CLASSES[size],
        showImage
          ? "bg-muted ring-1 ring-border"
          : "bg-secondary text-secondary-foreground ring-1 ring-border",
        className,
      )}
    >
      {showImage ? (
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
            className="h-full w-full object-cover text-transparent"
          />
        </>
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <UserIcon className="h-[55%] w-[55%]" aria-hidden="true" />
      )}
    </div>
  );
}
