import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsSubmitButton({
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "type">) {
  return (
    <Button
      {...props}
      type="submit"
      className={cn(
        "h-9 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700",
        className,
      )}
    />
  );
}
