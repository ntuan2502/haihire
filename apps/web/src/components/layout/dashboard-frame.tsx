"use client";

import { useEffect, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";

export function DashboardFrame({
  children,
  defaultSidebarOpen = true,
}: {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  const { user } = useAuth();

  // Keep Ctrl/Cmd+B out of stock SidebarProvider while typing or while any dialog is open.
  useEffect(() => {
    const guardSidebarShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        const target = event.target instanceof Element ? event.target : null;
        const isTypingTarget = Boolean(
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            (target instanceof HTMLElement && target.isContentEditable) ||
            target.closest('[contenteditable="true"]')),
        );
        if (isTypingTarget || document.querySelector('[role="dialog"]')) {
          event.stopPropagation();
        }
      }
    };

    document.addEventListener("keydown", guardSidebarShortcut);
    return () => {
      document.removeEventListener("keydown", guardSidebarShortcut);
    };
  }, []);

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
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
