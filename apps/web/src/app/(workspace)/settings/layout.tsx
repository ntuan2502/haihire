import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="settings-shell"
      className="flex flex-1 flex-col bg-background"
    >
      <section
        data-testid="settings-content"
        className="flex flex-1 flex-col w-full min-w-0 p-4 sm:p-6 space-y-6"
      >
        {children}
      </section>
    </div>
  );
}
