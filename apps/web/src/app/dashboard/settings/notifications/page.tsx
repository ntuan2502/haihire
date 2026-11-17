"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPreferences } from "@haihire/shared";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api/client";
import { toast } from "@/lib/toast";

const channels = [
  {
    label: "website",
    application: "applicationWebsite",
    interview: "interviewWebsite",
  },
  {
    label: "email",
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

  if (preferences.isLoading) return <LoadingSpinner />;
  const values = draft ?? preferences.data;
  if (!values) return <p role="alert">{t("notificationSettings.loadError")}</p>;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (draft) save.mutate(draft);
      }}
    >
      <h1 className="text-xl font-bold">{t("settings.tabs.notifications")}</h1>
      {channels.map((channel) => (
        <fieldset
          key={channel.label}
          disabled={save.isPending}
          className="space-y-4 rounded-xl border p-4"
        >
          <legend className="px-1 font-semibold">
            {t(`notificationSettings.${channel.label}`)}
          </legend>
          {(["application", "interview"] as const).map((event) => {
            const key = channel[event];
            return (
              <label key={key} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={values[key]}
                  onChange={(change) => {
                    setDraft({ ...values, [key]: change.target.checked });
                  }}
                />
                {t(`notificationSettings.${event}`)}
              </label>
            );
          })}
        </fieldset>
      ))}
      <Button type="submit" disabled={!draft || save.isPending}>
        {t("notificationSettings.save")}
      </Button>
    </form>
  );
}
