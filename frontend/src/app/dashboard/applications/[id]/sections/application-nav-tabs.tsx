import { ChevronDown } from "lucide-react";
import {
  OverviewSectionsPopover,
  type OverviewSectionsState,
} from "@/components/applications/overview-sections-popover";
import { useI18n } from "@/i18n";

interface ApplicationNavTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  overviewSections: OverviewSectionsState;
  setOverviewSections: React.Dispatch<
    React.SetStateAction<OverviewSectionsState>
  >;
  isOverviewPopoverOpen: boolean;
  setIsOverviewPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  overviewBtnRef: React.RefObject<HTMLButtonElement | null>;
  candidateDocumentsCount: number;
}

export function ApplicationNavTabs({
  activeTab,
  setActiveTab,
  overviewSections,
  setOverviewSections,
  isOverviewPopoverOpen,
  setIsOverviewPopoverOpen,
  overviewBtnRef,
  candidateDocumentsCount,
}: ApplicationNavTabsProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold scrollbar-none">
      {/* Overview tab with conditional arrow & dropdown toggle */}
      <div
        className={`relative flex items-center border-b-2 -mb-[1px] transition-colors ${
          activeTab === "overview"
            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
            : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("overview");
            setIsOverviewPopoverOpen(false);
          }}
          className={`py-2.5 cursor-pointer whitespace-nowrap ${
            activeTab === "overview" ? "pl-3.5 pr-1" : "px-3.5"
          }`}
        >
          {t("applications.tabs.overview")}
        </button>

        {activeTab === "overview" && (
          <button
            ref={overviewBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOverviewPopoverOpen((prev) => !prev);
            }}
            className="py-2.5 pr-2.5 pl-0.5 cursor-pointer flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            aria-label="Toggle overview sections"
            title="Toggle overview sections"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${
                isOverviewPopoverOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
        )}

        <OverviewSectionsPopover
          isOpen={isOverviewPopoverOpen}
          onClose={() => setIsOverviewPopoverOpen(false)}
          sections={overviewSections}
          onToggleSection={(key) =>
            setOverviewSections((prev) => ({ ...prev, [key]: !prev[key] }))
          }
          triggerRef={overviewBtnRef}
        />
      </div>

      {[
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
        { id: "properties", label: t("applications.tabs.properties") },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => {
            setActiveTab(tab.id);
            setIsOverviewPopoverOpen(false);
          }}
          className={`px-3.5 py-2.5 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 -mb-[1px] cursor-pointer ${
            activeTab === tab.id
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
