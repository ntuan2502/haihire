"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/shared/auth-guard";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthGuard requireOrg={false}>{children}</AuthGuard>;
}
