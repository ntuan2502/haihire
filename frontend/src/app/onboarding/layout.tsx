"use client";

import { type ReactNode } from "react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { GatewayNavbar } from "@/components/layout";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard requireOrg={false}>
      <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <GatewayNavbar />
        <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
