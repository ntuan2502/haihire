"use client";

import type { ReactNode } from "react";
import { cn } from "cn";

export type PreviewDeviceType = "desktop" | "tablet" | "mobile";

export interface DevicePreviewFrameProps {
  device: PreviewDeviceType;
  isMaximized?: boolean;
  url?: string;
  children: ReactNode;
  className?: string;
}

export function DevicePreviewFrame({
  device,
  isMaximized = false,
  children,
  className,
}: DevicePreviewFrameProps) {
  // Desktop view: Full-frame native viewport without boxed max-width or jittery animation
  if (device === "desktop") {
    return (
      <div
        key="device-desktop"
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col bg-white dark:bg-[#1e1e1e] animate-in fade-in duration-150"
      >
        <div className={cn("w-full flex-1 flex flex-col", className)}>
          {children}
        </div>
      </div>
    );
  }

  // Tablet and Mobile views: Ultra-sleek, modern hardware mockups on a studio canvas
  return (
    <div
      key={`device-canvas-${device}`}
      className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100/90 dark:bg-[#121214] p-4 sm:p-6 lg:p-8 flex items-center justify-center animate-in fade-in duration-150"
    >
      {/* ================= TABLET MOCKUP (Ultra-slim Modern iPad Pro) ================= */}
      {device === "tablet" && (
        <div
          key="mockup-tablet"
          className={cn(
            "bg-slate-950 dark:bg-black p-2 sm:p-2.5 rounded-[26px] sm:rounded-[30px] border border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.06)_inset] ring-1 ring-black/40 flex flex-col relative shrink-0",
            isMaximized
              ? "w-[880px] max-w-full h-[84vh]"
              : "w-[720px] sm:w-[760px] max-w-full h-[640px] max-h-[74vh]",
            className
          )}
        >
          {/* Subtle front camera sensor embedded in uniform top bezel */}
          <div className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-700/80 ring-1 ring-black/60 pointer-events-none" />

          {/* iPad Screen Content */}
          <div className="bg-white dark:bg-[#1e1e1e] rounded-[18px] sm:rounded-[22px] overflow-y-auto overflow-x-hidden flex-1 flex flex-col shadow-inner ring-1 ring-black/5 dark:ring-white/5">
            {children}
          </div>
        </div>
      )}

      {/* ================= MOBILE MOCKUP (Ultra-slim iPhone 16 Pro) ================= */}
      {device === "mobile" && (
        <div
          key="mockup-mobile"
          className={cn(
            "bg-slate-950 dark:bg-black p-2 rounded-[46px] sm:rounded-[50px] border border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)_inset] ring-1 ring-black/40 flex flex-col relative shrink-0",
            isMaximized
              ? "w-[390px] h-[84vh]"
              : "w-[360px] sm:w-[375px] h-[660px] max-h-[74vh]",
            className
          )}
        >
          {/* iPhone Screen Container with integrated Dynamic Island & Home Bar */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[38px] sm:rounded-[42px] overflow-hidden flex-1 flex flex-col shadow-inner ring-1 ring-black/5 dark:ring-white/5 relative">
            {/* Dynamic Island (floating over screen top) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-20 h-4 bg-black rounded-full flex items-center justify-end px-1.5 shadow-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 ring-1 ring-slate-800" />
            </div>

            {/* Scrollable screen content with top clearance for Dynamic Island */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pt-7 pb-4">
              {children}
            </div>

            {/* Home indicator bar (floating at bottom) */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-28 h-1 bg-slate-400/50 dark:bg-slate-500/50 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
