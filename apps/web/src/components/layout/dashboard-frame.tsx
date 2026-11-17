"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { Navbar } from "@/components/layout";

export function DashboardFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();

  if (segment === null) return children;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 font-sans transition-colors duration-200">
      <Navbar />
      <main id="main-content" className="flex-1 min-h-0 flex flex-col">
        {children}
      </main>
    </div>
  );
}
