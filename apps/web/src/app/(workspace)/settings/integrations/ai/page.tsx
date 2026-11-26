"use client";

import { useHasPermission } from "@/hooks/use-has-permission";
import { AiSettingsTab } from "@/components/settings/integrations";

export default function AiIntegrationsSettingsPage() {
  const canManageIntegrations = useHasPermission(
    "settings:manage_integrations",
  );

  if (!canManageIntegrations) {
    return null;
  }

  return <AiSettingsTab />;
}
