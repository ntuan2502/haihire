"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSubTabBase {
  id?: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  count?: number;
}

export type SettingsSubTabLinkItem = SettingsSubTabBase & {
  href: string;
  onClick?: never;
};

export type SettingsSubTabButtonItem = SettingsSubTabBase & {
  href?: never;
  onClick: () => void;
};

export type SettingsSubTabItem =
  SettingsSubTabLinkItem | SettingsSubTabButtonItem;

interface SettingsSubTabsProps {
  items: SettingsSubTabItem[];
  ariaLabel: string;
  className?: string;
}

function SettingsSubTabContent({ item }: { item: SettingsSubTabItem }) {
  const Icon = item.icon;
  return (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
      {typeof item.count === "number" && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            item.isActive
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {item.count}
        </span>
      )}
    </>
  );
}

function getTabItemClassName(isActive: boolean): string {
  return cn(
    "inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0",
    isActive
      ? "border-primary text-foreground font-semibold"
      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
  );
}

/**
 * Renders underline-style navigation sub-tabs shared across settings pages,
 * supporting both App Router route links and local button tabs.
 */
export function SettingsSubTabs({
  items,
  ariaLabel,
  className,
}: SettingsSubTabsProps) {
  const containerClassName = cn(
    "flex flex-nowrap items-center gap-1 border-b border-border overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    className,
  );
  const isLinkMode =
    items.length > 0 &&
    items.every((item) => "href" in item && typeof item.href === "string");

  if (isLinkMode) {
    return (
      <nav aria-label={ariaLabel} className={containerClassName}>
        {items.map((item) => {
          if (!("href" in item) || typeof item.href !== "string") return null;
          return (
            <Link
              key={item.id ?? item.href}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={getTabItemClassName(item.isActive)}
            >
              <SettingsSubTabContent item={item} />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className={containerClassName}>
      {items.map((item) => {
        if ("href" in item && typeof item.href === "string") return null;
        return (
          <button
            key={item.id ?? item.label}
            type="button"
            role="tab"
            aria-selected={item.isActive}
            onClick={item.onClick}
            className={getTabItemClassName(item.isActive)}
          >
            <SettingsSubTabContent item={item} />
          </button>
        );
      })}
    </div>
  );
}
