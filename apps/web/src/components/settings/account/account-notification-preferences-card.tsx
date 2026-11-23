"use client";

import { useState } from "react";
import { Bell, Mail, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPreferences } from "@haihire/shared";
import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api/client";
import { toast } from "@/lib/toast";

const channels = [
  {
    label: "website",
    icon: Bell,
    application: "applicationWebsite",
    interview: "interviewWebsite",
  },
  {
    label: "email",
    icon: Mail,
    application: "applicationEmail",
    interview: "interviewEmail",
  },
] as const;

export function AccountNotificationPreferencesCard() {
  const { user } = useAuth();
  const organizationId = user?.organizationId ?? user?.organization?.id;

  if (!organizationId) {
    return null;
  }

  return (
    <AccountNotificationPreferencesForm
      key={`${organizationId}:${user?.id}`}
      organizationId={organizationId}
      organizationName={user?.organization?.name}
      userId={user?.id}
    />
  );
}

function AccountNotificationPreferencesForm({
  organizationId,
  organizationName,
  userId,
}: {
  organizationId: string;
  organizationName?: string | null;
  userId?: string;
}) {
  const { t } = useI18n();
  const cache = useQueryClient();
  const queryKey = [
    "notification-preferences",
    organizationId,
    userId,
  ] as const;

  const preferences = useQuery({
    queryKey,
    enabled: Boolean(organizationId),
    queryFn: async () =>
      (await api.get<NotificationPreferences>("/notifications/preferences"))
        .data,
  });

  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const save = useMutation({
    mutationFn: async (body: NotificationPreferences) =>
      (
        await api.put<NotificationPreferences>(
          "/notifications/preferences",
          body,
        )
      ).data,
    onSuccess: (data) => {
      cache.setQueryData(queryKey, data);
      setDraft(null);
      toast.success(t("notificationSettings.saved"));
    },
    onError: () => toast.error(t("notificationSettings.saveError")),
  });

  const values = draft ?? preferences.data;
  const savedPreferences = preferences.data;
  const hasChanges = Boolean(
    draft &&
    savedPreferences &&
    channels.some(
      ({ application, interview }) =>
        draft[application] !== savedPreferences[application] ||
        draft[interview] !== savedPreferences[interview],
    ),
  );

  return (
    <SettingsCard id="notifications" className="space-y-5 scroll-mt-6">
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("settings.tabs.notifications")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {organizationName
              ? t("settings.tabs.notificationsScope", {
                  workspace: organizationName,
                })
              : t("settings.tabs.notificationsSub")}
          </p>
        </div>
      </div>

      {preferences.isLoading ? (
        <LoadingSpinner />
      ) : !values ? (
        <p role="alert" className="text-sm text-destructive">
          {t("notificationSettings.loadError")}
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft && hasChanges && !save.isPending) save.mutate(draft);
          }}
        >
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-1">
            {channels.map(({ icon: Icon, ...channel }) => (
              <fieldset
                key={channel.label}
                disabled={save.isPending}
                aria-labelledby={`notification-channel-${channel.label}`}
                className="min-w-0 space-y-2 rounded-lg border border-border bg-muted/30 p-3.5"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className="size-4 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                  <h3
                    id={`notification-channel-${channel.label}`}
                    className="text-xs font-semibold text-foreground"
                  >
                    {t(`notificationSettings.${channel.label}`)}
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {(["application", "interview"] as const).map((event) => {
                    const key = channel[event];
                    return (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center justify-between gap-4 py-2.5 text-xs font-medium text-foreground"
                      >
                        {t(`notificationSettings.${event}`)}
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 accent-primary cursor-pointer"
                          checked={values[key]}
                          onChange={(change) => {
                            setDraft({
                              ...values,
                              [key]: change.target.checked,
                            });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="pt-1">
            <SettingsButton
              type="submit"
              icon={Save}
              pending={save.isPending}
              disabled={!hasChanges || save.isPending}
            >
              {t(
                save.isPending ? "common.saving" : "notificationSettings.save",
              )}
            </SettingsButton>
          </div>
        </form>
      )}
    </SettingsCard>
  );
}
