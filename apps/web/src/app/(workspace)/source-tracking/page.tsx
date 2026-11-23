"use client";

import { Suspense, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { useMyOrg } from "@/hooks/use-organization-queries";
import { useAllJobs } from "@/hooks/use-queries";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useSourcingStatsQuery,
  useTrackingLinksQuery,
  useAttributionLogQuery,
  useUpdateTrackingLinkMutation,
  useDeleteTrackingLinkMutation,
} from "@/hooks/use-sourcing-queries";
import type { TrackingLinkItem } from "@haihire/shared";
import {
  SourcingStatsCards,
  OverviewTab,
  TrackingLinksTab,
  AttributionLogTab,
  CreateLinkModal,
  EditLinkModal,
} from "@/components/sourcing";
import { Button } from "@/components/ui/button";
import {
  SegmentedTabs,
  type TabItem,
} from "@/components/shared/segmented-tabs";
import { CustomSelect } from "@/components/shared/custom-select";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusState } from "@/components/shared/status-state";
import { Plus } from "lucide-react";
import type { TimeRangeFilter } from "@haihire/shared";
import { useHasPermission } from "@/hooks/use-has-permission";

type TabKey = "overview" | "links" | "attribution";

function SourceTrackingContent() {
  const { user, canEdit: _canEdit } = useAuth();
  const { t } = useI18n();

  const canViewSourcing = useHasPermission("sourcing:view");
  const canCreateLink = useHasPermission("sourcing:create");
  const canUpdateLink = useHasPermission("sourcing:update");
  const canDeleteLink = useHasPermission("sourcing:delete");

  // URL synchronized state
  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
    getParam,
    setParams,
  } = useTableParams();

  const rawTab = getParam("tab", "overview");
  const activeTab: TabKey =
    rawTab === "links" || rawTab === "attribution" ? rawTab : "overview";

  const rawTime = getParam("timeRange", "30d");
  const timeRange: TimeRangeFilter =
    rawTime === "7d" || rawTime === "90d" || rawTime === "all"
      ? rawTime
      : "30d";

  const rawJobId = getParam("jobId", "");
  const selectedJobId = rawJobId && rawJobId !== "ALL" ? rawJobId : undefined;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<TrackingLinkItem | null>(null);

  // Organization info (for public career site link slug)
  const { data: myOrg } = useMyOrg();
  const orgSlug =
    myOrg?.slug || user?.organization?.slug || user?.organizationId || "demo";

  // Jobs for filters and modal
  const { data: rawJobs = [] } = useAllJobs(user?.organizationId);
  const jobsList = useMemo(
    () => rawJobs.map((j) => ({ id: j.id, title: j.title })),
    [rawJobs],
  );

  // Queries
  const { data: stats, isLoading: statsLoading } = useSourcingStatsQuery({
    timeRange,
    jobId: selectedJobId,
  });

  const { data: linksData, isLoading: linksLoading } = useTrackingLinksQuery({
    page: activeTab === "links" ? currentPage : 1,
    limit: rowsPerPage || 15,
    search: activeTab === "links" ? search.trim() || undefined : undefined,
    jobId: selectedJobId,
  });

  const { data: attributionData, isLoading: attributionLoading } =
    useAttributionLogQuery({
      page: activeTab === "attribution" ? currentPage : 1,
      limit: rowsPerPage || 15,
      search:
        activeTab === "attribution" ? search.trim() || undefined : undefined,
      jobId: selectedJobId,
      timeRange,
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

  const hasLinksCount = linksData !== undefined || stats !== undefined;
  const hasAttributionCount =
    attributionData !== undefined || stats !== undefined;
  const linksCount = linksData?.total ?? stats?.totalLinksCount ?? 0;
  const attributionCount = attributionData?.total ?? stats?.trackedCount ?? 0;

  const tabItems: TabItem<TabKey>[] = useMemo(
    () => [
      { id: "overview", label: t("sourcing.tabs.overview") },
      {
        id: "links",
        label: t("sourcing.tabs.trackingLinks"),
        count: hasLinksCount ? linksCount : undefined,
      },
      {
        id: "attribution",
        label: t("sourcing.tabs.attributionLog"),
        count: hasAttributionCount ? attributionCount : undefined,
      },
    ],
    [t, hasLinksCount, linksCount, hasAttributionCount, attributionCount],
  );

  if (!canViewSourcing) {
    return (
      <div className="flex-1 flex flex-col">
        <StatusState
          status="403"
          variant="page"
          actionLabel={t("common.dashboard")}
          actionHref="/dashboard"
        />
      </div>
    );
  }

  const isInitialTabLoading =
    (activeTab === "overview" && statsLoading && !stats) ||
    (activeTab === "links" && linksLoading && !linksData) ||
    (activeTab === "attribution" && attributionLoading && !attributionData);

  if (isInitialTabLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex-1 w-full p-4 sm:p-6 space-y-4">
      {/* Standard Page Header Row */}
      <PageHeader
        title={t("sourcing.title")}
        badge={hasLinksCount ? linksCount : undefined}
        actions={
          canCreateLink ? (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-9 px-3.5 sm:px-4 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{t("sourcing.newLink")}</span>
            </Button>
          ) : undefined
        }
      />

      {/* Modern Unified Responsive Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Tab Switcher using SegmentedTabs */}
        <SegmentedTabs
          tabs={tabItems}
          activeTab={activeTab}
          onChange={(newTab) => {
            setParams({
              tab: newTab === "overview" ? null : newTab,
              page: 1,
            });
          }}
        />

        {/* Right: Contextual Controls Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
          {/* Search Input (visible on links and attribution tabs) */}
          {activeTab !== "overview" && (
            <div className="w-full sm:w-64 md:w-72 sm:flex-initial">
              <SearchInput
                placeholder={
                  activeTab === "links"
                    ? t("sourcing.links.searchPlaceholder")
                    : t("sourcing.attribution.searchPlaceholder")
                }
                aria-label={
                  activeTab === "links"
                    ? t("sourcing.links.searchPlaceholder")
                    : t("sourcing.attribution.searchPlaceholder")
                }
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}

          {/* Job Filter CustomSelect */}
          <CustomSelect
            value={selectedJobId || "ALL"}
            onChange={(val) => {
              setParams({ jobId: val === "ALL" ? null : val, page: 1 });
            }}
            options={[
              { value: "ALL", label: t("sourcing.allJobs") },
              ...jobsList.map((j) => ({ value: j.id, label: j.title })),
            ]}
            placeholder={t("sourcing.allJobs")}
            className="flex-1 min-w-[140px] sm:flex-initial sm:w-48 shrink-0"
            triggerClassName="w-full h-9 text-xs font-medium bg-background border border-input rounded-md px-3"
          />

          {/* Time Range Filter CustomSelect */}
          <CustomSelect
            value={timeRange}
            onChange={(val) => {
              setParams({
                timeRange: val === "30d" ? null : (val as TimeRangeFilter),
              });
            }}
            options={[
              { value: "7d", label: t("sourcing.time7d") },
              { value: "30d", label: t("sourcing.time30d") },
              { value: "90d", label: t("sourcing.time90d") },
              { value: "all", label: t("sourcing.timeAll") },
            ]}
            className="flex-1 min-w-[120px] sm:flex-initial sm:w-36 shrink-0"
            triggerClassName="w-full h-9 text-xs font-medium bg-background border border-input rounded-md px-3"
          />
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* 4 Metric KPI Cards via MetricCard shared component */}
          <SourcingStatsCards stats={stats} isLoading={statsLoading} />

          {/* Overview Visualizations Grid */}
          <OverviewTab
            stats={stats}
            isLoading={statsLoading}
            onNavigateToLinks={() => setParams({ tab: "links", page: 1 })}
            onNavigateToAttribution={() =>
              setParams({ tab: "attribution", page: 1 })
            }
          />
        </div>
      )}

      {/* TAB 2: TRACKING LINKS */}
      {activeTab === "links" && (
        <div className="animate-in fade-in duration-200">
          <TrackingLinksTab
            data={linksData}
            isLoading={linksLoading}
            page={currentPage}
            pageSize={rowsPerPage || 15}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(newSize) => setRowsPerPage(newSize)}
            orgSlug={orgSlug}
            onToggleStatus={canUpdateLink ? handleToggleStatus : undefined}
            onDeleteLink={canDeleteLink ? handleDeleteLink : undefined}
            onEditLink={
              canUpdateLink ? (link) => setEditingLink(link) : undefined
            }
          />
        </div>
      )}

      {/* TAB 3: ATTRIBUTION LOG */}
      {activeTab === "attribution" && (
        <div className="animate-in fade-in duration-200">
          <AttributionLogTab
            data={attributionData}
            isLoading={attributionLoading}
            page={currentPage}
            pageSize={rowsPerPage || 15}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(newSize) => setRowsPerPage(newSize)}
          />
        </div>
      )}

      {/* Modal Create Link */}
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        jobs={jobsList}
      />

      {/* Modal Edit Link */}
      {editingLink && (
        <EditLinkModal
          isOpen={Boolean(editingLink)}
          onClose={() => setEditingLink(null)}
          link={editingLink}
          jobs={jobsList}
        />
      )}
    </div>
  );
}

export default function SourceTrackingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SourceTrackingContent />
    </Suspense>
  );
}
