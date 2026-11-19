import { useI18n } from "@/i18n";

interface ApplicationNavTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  candidateDocumentsCount: number;
}

export function ApplicationNavTabs({
  activeTab,
  setActiveTab,
  candidateDocumentsCount,
}: ApplicationNavTabsProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto text-xs font-semibold scrollbar-none">
      {[
        { id: "overview", label: t("applications.tabs.overview") },
        { id: "inbox", label: t("applications.tabs.inbox") },
        { id: "ai", label: t("applications.tabs.ai") },
        { id: "interviews", label: t("applications.tabs.interviews") },
        {
          id: "documents",
          label: `${t("applications.tabs.documents")} (${candidateDocumentsCount})`,
        },
        { id: "responses", label: t("applications.tabs.responses") },
        { id: "notes", label: t("applications.tabs.notes") },
        { id: "timeline", label: t("applications.tabs.timeline") },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
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
