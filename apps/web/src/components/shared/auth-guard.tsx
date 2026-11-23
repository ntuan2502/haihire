"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { LoadingSpinner } from "./loading-spinner";

export interface AuthGuardProps {
  children: ReactNode;
  requireOrg?: boolean;
}

export function AuthGuard({ children, requireOrg = true }: AuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace("/auth/login");
      } else if (requireOrg && user && !user.organizationId) {
        router.replace("/auth/onboarding");
      }
    }
  }, [isAuthenticated, user, loading, requireOrg, router]);

  if (
    loading ||
    !isAuthenticated ||
    (requireOrg && user && !user.organizationId)
  ) {
    return <LoadingSpinner fullScreen />;
  }

  return <>{children}</>;
}
