"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Brain, Plug } from "lucide-react";
import { PageHeader, StatusState } from "@/components/shared";
import { SettingsSubTabs } from "@/components/settings/settings-sub-tabs";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";

export default function IntegrationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const canManageIntegrations = useHasPermission(
    "settings:manage_integrations",
  );

  const isWebhooks = pathname.startsWith("/settings/integrations/webhooks");
  const isAi =
    pathname === "/settings/integrations" ||
    pathname.startsWith("/settings/integrations/ai");

  const tabs = [
    {
      href: "/settings/integrations/ai",
      label: t("settings.integrations.tabs.ai"),
      icon: Brain,
      isActive: isAi && !isWebhooks,
    },
    {
      href: "/settings/integrations/webhooks",
      label: t("settings.integrations.tabs.webhooks"),
      icon: Plug,
      isActive: isWebhooks,
    },
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.integrations.title")}
        subtitle={
          isWebhooks
            ? t("settings.integrations.description")
            : t("settings.integrations.aiDescription")
        }
        icon={Plug}
        bordered
      />

      {!canManageIntegrations ? (
        <StatusState
          status="403"
          variant="card"
          actionLabel={t("settings.backToSettings")}
          actionHref="/settings"
        />
      ) : (
        <>
          <SettingsSubTabs
            ariaLabel={t("settings.integrations.title")}
            items={tabs}
          />
          {children}
        </>
      )}
    </div>
  );
}
