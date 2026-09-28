"use client";

import type { ReactNode } from "react";
import { GatewayNavbar, PublicFooter } from "@/components/layout";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-slate-950 font-sans transition-colors">
      <GatewayNavbar />
      <main className="flex-1 flex flex-col items-center justify-start pt-10 sm:pt-14 pb-16 px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
