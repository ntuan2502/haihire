"use client";

import { Suspense, useState } from "react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { useMyOrg } from "@/hooks/use-organization-queries";
import { useAllJobs } from "@/hooks/use-queries";
import {
  useSourcingStatsQuery,
  useTrackingLinksQuery,
  useAttributionLogQuery,
  useUpdateTrackingLinkMutation,
  useDeleteTrackingLinkMutation,
} from "@/hooks/use-sourcing-queries";
import {
  SourcingHeader,
  SourcingStatsCards,
  OverviewTab,
  TrackingLinksTab,
  AttributionLogTab,
  CreateLinkModal,
} from "@/components/sourcing";
import { BarChart3, Link2, Users } from "lucide-react";
import type { TimeRangeFilter } from "@haihire/shared";

type TabKey = "overview" | "links" | "attribution";

function SourceTrackingContent() {
  const { user } = useAuth();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("30d");
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Pagination & Search for Links Tab
  const [linksPage, setLinksPage] = useState(1);
  const [linksSearch, setLinksSearch] = useState("");

  // Pagination & Search for Attribution Log Tab
  const [attributionPage, setAttributionPage] = useState(1);
  const [attributionSearch, setAttributionSearch] = useState("");

  // Organization info (for public career site link slug)
  const { data: myOrg } = useMyOrg();
  const orgSlug = myOrg?.slug || user?.organizationId || "demo";

  // Jobs for filters and modal
  const { data: rawJobs = [] } = useAllJobs(user?.organizationId);
  const jobsList = rawJobs.map((j) => ({ id: j.id, title: j.title }));

  // Queries
  const { data: stats, isLoading: statsLoading } = useSourcingStatsQuery({
    timeRange,
    jobId: selectedJobId,
  });

  const { data: linksData, isLoading: linksLoading } = useTrackingLinksQuery({
    page: linksPage,
    limit: 15,
    search: linksSearch.trim() || undefined,
    jobId: selectedJobId,
  });

  const { data: attributionData, isLoading: attributionLoading } =
    useAttributionLogQuery({
      page: attributionPage,
      limit: 15,
      search: attributionSearch.trim() || undefined,
      jobId: selectedJobId,
    });

  // Mutations
  const updateLinkMutation = useUpdateTrackingLinkMutation();
  const deleteLinkMutation = useDeleteTrackingLinkMutation();

  const handleToggleStatus = (id: string, currentActive: boolean) => {
    updateLinkMutation.mutate({ id, data: { isActive: !currentActive } });
  };

  const handleDeleteLink = (id: string) => {
    deleteLinkMutation.mutate(id);
  };

  const linksCount = linksData?.total ?? stats?.totalLinksCount ?? 0;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-200">
      <Navbar activeTab="sourcing" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header with Title, Time Filter, Job Selector & + New Link */}
        <SourcingHeader
          timeRange={timeRange}
          onTimeRangeChange={(val) => setTimeRange(val)}
          selectedJobId={selectedJobId}
          onJobSelect={(jobId) => setSelectedJobId(jobId)}
          jobs={jobsList}
          onOpenCreateLink={() => setIsCreateModalOpen(true)}
        />

        {/* 3 Main Tabs Switcher */}
        <div className="flex items-center gap-1 border-b border-slate-200/80 dark:border-slate-800">
          {/* Tab 1: Overview */}
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>{t("sourcing.tabs.overview")}</span>
          </button>

          {/* Tab 2: Tracking Links */}
          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={`inline-flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
              activeTab === "links"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Link2 className="h-4 w-4" />
            <span>{t("sourcing.tabs.trackingLinks")}</span>
            {linksCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {linksCount}
              </span>
            )}
          </button>

          {/* Tab 3: Attribution Log */}
          <button
            type="button"
            onClick={() => setActiveTab("attribution")}
            className={`inline-flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
              activeTab === "attribution"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>{t("sourcing.tabs.attributionLog")}</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 4 Metric KPI Cards */}
            <SourcingStatsCards stats={stats} isLoading={statsLoading} />

            {/* Overview Grid (Applications by Source, Conversion, Top Links, Top Referrers, Recent) */}
            <OverviewTab
              stats={stats}
              isLoading={statsLoading}
              onNavigateToLinks={() => setActiveTab("links")}
              onNavigateToAttribution={() => setActiveTab("attribution")}
            />
          </div>
        )}

        {/* Tab 2: Tracking Links */}
        {activeTab === "links" && (
          <div className="animate-in fade-in duration-200">
            <TrackingLinksTab
              data={linksData}
              isLoading={linksLoading}
              page={linksPage}
              onPageChange={(p) => setLinksPage(p)}
              search={linksSearch}
              onSearchChange={(s) => {
                setLinksSearch(s);
                setLinksPage(1);
              }}
              orgSlug={orgSlug}
              onToggleStatus={handleToggleStatus}
              onDeleteLink={handleDeleteLink}
            />
          </div>
        )}

        {/* Tab 3: Attribution Log */}
        {activeTab === "attribution" && (
          <div className="animate-in fade-in duration-200">
            <AttributionLogTab
              data={attributionData}
              isLoading={attributionLoading}
              page={attributionPage}
              onPageChange={(p) => setAttributionPage(p)}
              search={attributionSearch}
              onSearchChange={(s) => {
                setAttributionSearch(s);
                setAttributionPage(1);
              }}
            />
          </div>
        )}
      </main>

      {/* Modal Create Link */}
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        jobs={jobsList}
        orgSlug={orgSlug}
      />
    </div>
  );
}

export default function SourceTrackingPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}>
        <SourceTrackingContent />
      </Suspense>
    </AuthGuard>
  );
}
