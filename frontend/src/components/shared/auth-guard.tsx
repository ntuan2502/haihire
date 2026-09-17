"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { LoadingSpinner } from "./loading-spinner";

export interface AuthGuardProps {
  children: ReactNode;
  requireOrg?: boolean;
}

export function AuthGuard({ children, requireOrg = true }: AuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, loading, refreshUser } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
    }
  }, [isAuthenticated, refreshUser]);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (requireOrg && user && !user.organizationId) {
        router.replace("/onboarding/create-org");
      }
    }
  }, [isAuthenticated, user, loading, requireOrg, router]);

  if (loading) {
    return <LoadingSpinner fullScreen text={t("common.loading") || "Loading workspace..."} />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireOrg && user && !user.organizationId) {
    return null;
  }

  return <>{children}</>;
}
