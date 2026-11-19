"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";

export function DashboardFrame({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="main-content" className="min-w-0">
        <DashboardHeader />
        <div
          key={user?.organizationId ?? "no-org"}
          className="flex min-h-0 flex-1 flex-col"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
