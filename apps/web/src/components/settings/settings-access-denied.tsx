"use client";

import type { ComponentType } from "react";
import { ShieldAlert } from "lucide-react";

interface SettingsAccessDeniedProps {
  title: string;
  description?: string;
  message: string;
  icon?: ComponentType<{ className?: string }>;
}

/**
 * Shared inline access-denied panel rendered by restricted `/dashboard/settings/*`
 * routes when the active user lacks the required permission.
 */
export function SettingsAccessDenied({
  title,
  description,
  message,
  icon: Icon,
}: SettingsAccessDeniedProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          {Icon && (
            <Icon className="w-6 h-6 text-slate-600 dark:text-slate-400 shrink-0" />
          )}
          <span>{title}</span>
        </h1>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        )}
      </div>

      <div
        role="alert"
        className="p-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 flex items-center gap-3"
      >
        <ShieldAlert
          className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
}
