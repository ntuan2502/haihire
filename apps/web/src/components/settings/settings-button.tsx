import type { ComponentProps, ElementType } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SettingsButtonProps = ComponentProps<typeof Button> & {
  icon?: ElementType;
  pending?: boolean;
};

export function SettingsButton({
  children,
  className,
  variant = "default",
  size = "sm",
  icon: Icon,
  pending = false,
  disabled,
  ...props
}: SettingsButtonProps) {
  const ActionIcon = pending ? Loader2 : Icon;
  return (
    <Button
      {...props}
      variant={variant}
      size={size}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(
        "text-xs [&_svg]:size-3.5",
        size?.startsWith("icon") ? "size-8" : "h-8 gap-1.5 px-3",
        className,
      )}
    >
      {ActionIcon && (
        <ActionIcon
          className={cn("size-3.5", pending && "animate-spin")}
          aria-hidden="true"
        />
      )}
      {children}
    </Button>
  );
}
