import type { ReactNode } from "react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { DashboardFrame } from "@/components/layout/dashboard-frame";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardFrame>{children}</DashboardFrame>
    </AuthGuard>
  );
}
