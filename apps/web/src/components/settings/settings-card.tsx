import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function SettingsCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "min-w-0 w-full rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
