"use client";

import { useI18n } from "@/i18n";

export const APPLICATION_DETAIL_TABS = [
  "overview",
  "interviews",
  "documents",
  "notes",
  "timeline",
] as const;

export type ApplicationDetailTab = (typeof APPLICATION_DETAIL_TABS)[number];

export interface ApplicationDetailTabsProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  interviewsCount?: number;
  documentsCount: number;
  notesCount?: number;
}

/**
 * Shared 5-tab navigation bar used identically in Application Detail and
 * the Pipeline Candidate Detail pane.
 */
export function ApplicationDetailTabs({
  activeTab,
  onSelectTab,
  interviewsCount = 0,
  documentsCount,
  notesCount,
}: ApplicationDetailTabsProps) {
  const { t } = useI18n();

  const tabs = [
    { id: "overview", label: t("applications.tabs.overview") },
    {
      id: "interviews",
      label:
        interviewsCount > 0
          ? `${t("applications.tabs.interviews")} (${interviewsCount})`
          : t("applications.tabs.interviews"),
    },
    {
      id: "documents",
      label: `${t("applications.tabs.documents")} (${documentsCount})`,
    },
    {
      id: "notes",
      label:
        notesCount !== undefined && notesCount > 0
          ? `${t("applications.tabs.notes")} (${notesCount})`
          : t("applications.tabs.notes"),
    },
    { id: "timeline", label: t("applications.tabs.timeline") },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto text-xs font-semibold scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelectTab(tab.id)}
          className={`px-3.5 py-2.5 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 -mb-[1px] cursor-pointer ${
            activeTab === tab.id
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
