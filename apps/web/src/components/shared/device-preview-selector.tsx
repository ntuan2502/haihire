"use client";

import { Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "cn";
import { useI18n } from "@/i18n";
import type { PreviewDeviceType } from "./device-preview-frame";

export interface DevicePreviewSelectorProps {
  device: PreviewDeviceType;
  onChange: (device: PreviewDeviceType) => void;
  className?: string;
}

export function DevicePreviewSelector({
  device,
  onChange,
  className,
}: DevicePreviewSelectorProps) {
  const { t } = useI18n();

  const options: Array<{
    id: PreviewDeviceType;
    label: string;
    icon: typeof Monitor;
  }> = [
    {
      id: "desktop",
      label: t("email.previewDeviceDesktop"),
      icon: Monitor,
    },
    {
      id: "tablet",
      label: t("email.previewDeviceTablet"),
      icon: Tablet,
    },
    {
      id: "mobile",
      label: t("email.previewDeviceMobile"),
      icon: Smartphone,
    },
  ];

  return (
    <div
      className={cn(
        "flex items-center bg-muted p-0.5 rounded-lg border border-border select-none",
        className,
      )}
      role="group"
      aria-label={t("email.previewDeviceControls")}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = device === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
              isActive
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
