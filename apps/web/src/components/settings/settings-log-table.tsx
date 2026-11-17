import type { ReactNode } from "react";

export function SettingsLogTable({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs">
      <div className="w-full overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}
