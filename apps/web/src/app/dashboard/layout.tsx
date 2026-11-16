import type { ReactNode } from "react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 font-sans transition-colors duration-200">
        <Navbar />
        <main id="main-content" className="flex-1 min-h-0 flex flex-col">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
