"use client";

import { Bell, Mail } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPreferences } from "@haihire/shared";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
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

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  return <NotificationSettings key={`${user?.organizationId}:${user?.id}`} />;
}

function NotificationSettings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const cache = useQueryClient();
  const queryKey = [
    "notification-preferences",
    user?.organizationId,
    user?.id,
  ] as const;
  const preferences = useQuery({
    queryKey,
    enabled: Boolean(user?.organizationId),
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

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.tabs.notifications")}
        subtitle={t("settings.tabs.notificationsSub")}
        icon={Bell}
        bordered
      />
      {preferences.isLoading ? (
        <LoadingSpinner />
      ) : !values ? (
        <p role="alert" className="text-sm text-destructive">
          {t("notificationSettings.loadError")}
        </p>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft) save.mutate(draft);
          }}
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {channels.map(({ icon: Icon, ...channel }) => (
              <fieldset
                key={channel.label}
                disabled={save.isPending}
                aria-labelledby={`notification-channel-${channel.label}`}
                className="min-w-0 space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/60 dark:text-blue-400">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h2
                    id={`notification-channel-${channel.label}`}
                    className="text-sm font-bold text-slate-900 dark:text-white"
                  >
                    {t(`notificationSettings.${channel.label}`)}
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(["application", "interview"] as const).map((event) => {
                    const key = channel[event];
                    return (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center justify-between gap-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        {t(`notificationSettings.${event}`)}
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 accent-blue-600"
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
          <div className="flex justify-end">
            <Button type="submit" disabled={!draft || save.isPending}>
              {t("notificationSettings.save")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
