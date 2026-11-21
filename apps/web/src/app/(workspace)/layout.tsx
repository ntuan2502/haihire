import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AuthGuard } from "@/components/shared/auth-guard";
import { DashboardFrame } from "@/components/layout/dashboard-frame";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  let defaultSidebarOpen = true;
  try {
    const cookieStore = await cookies();
    const sidebarCookie = cookieStore.get("sidebar_state")?.value;
    if (sidebarCookie === "false") {
      defaultSidebarOpen = false;
    }
  } catch {
    // Keep expanded default when cookies() is unavailable
  }

  return (
    <AuthGuard>
      <DashboardFrame defaultSidebarOpen={defaultSidebarOpen}>
        {children}
      </DashboardFrame>
    </AuthGuard>
  );
}
