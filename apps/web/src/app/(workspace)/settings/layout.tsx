import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="settings-shell"
      className="flex flex-1 flex-col bg-background"
    >
      <section
        data-testid="settings-content"
        className="mx-auto w-full max-w-6xl flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 space-y-6"
      >
        {children}
      </section>
    </div>
  );
}
