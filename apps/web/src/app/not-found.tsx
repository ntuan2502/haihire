"use client";

import { Home, LayoutDashboard } from "lucide-react";
import { useOptionalI18n } from "@/i18n/optional";
import { StatusState } from "@/components/shared/status-state";

export default function NotFound() {
  const { t } = useOptionalI18n();

  return (
    <StatusState
      status="404"
      variant="page"
      testId="not-found-page"
      title={t("errors.notFound.title")}
      description={t("errors.notFound.description")}
      actionLabel={t("errors.notFound.goHome")}
      actionHref="/"
      actionIcon={Home}
      secondaryAction={{
        label: t("nav.dashboard"),
        href: "/dashboard",
        variant: "outline",
        icon: LayoutDashboard,
      }}
    />
  );
}
