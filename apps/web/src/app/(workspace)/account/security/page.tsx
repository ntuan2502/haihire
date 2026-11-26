"use client";

import { Lock } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { AccountPasswordCard } from "@/components/settings/account/account-password-card";
import { AccountSessionsCard } from "@/components/settings/account/account-sessions-card";
import { AccountSecurityLogCard } from "@/components/settings/account/account-security-log-card";

export default function AccountSecurityPage() {
  const { setSession } = useAuth();
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Lock className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">
            {t("settings.accountSecurity.title")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("settings.accountSecurity.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 space-y-6 min-w-0">
          <AccountPasswordCard setSession={setSession} />
        </div>
        <div className="xl:col-span-7 space-y-6 min-w-0">
          <AccountSessionsCard />
          <AccountSecurityLogCard />
        </div>
      </div>
    </div>
  );
}
