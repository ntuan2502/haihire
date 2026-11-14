"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { useMyOrg } from "@/hooks/use-organization-queries";
import { useAllJobs } from "@/hooks/use-queries";
import { useTrackingLinkDetailQuery } from "@/hooks/use-sourcing-queries";
import {
  LinkHeader,
  LinkUrlBanner,
  LinkStatsCards,
  LinkPipelineCard,
  LinkTrendCard,
  LinkAttributedTable,
  LinkConfigCard,
  LinkReferrersCard,
  EditLinkModal,
} from "@/components/sourcing";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { StatusState } from "@/components/shared/status-state";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/lib/toast";
import { buildPublicTrackingUrl, type TimeRangeFilter } from "@haihire/shared";
import { slugify } from "@/lib/utils";
import { useHasPermission } from "@/hooks/use-has-permission";

function TrackingLinkDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useI18n();

  const canViewSourcing = useHasPermission("sourcing:view");
  const canUpdateLink = useHasPermission("sourcing:update");

  const rawId = params?.id;
  const linkId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const rawTime = searchParams.get("timeRange") || "30d";
  const timeRange: TimeRangeFilter =
    rawTime === "7d" || rawTime === "90d" || rawTime === "all"
      ? (rawTime as TimeRangeFilter)
      : "30d";

  const setTimeRange = (range: TimeRangeFilter) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("timeRange", range);
    router.replace(`?${sp.toString()}`);
  };

  const [isCopied, setIsCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Organization slug for real public career URLs
  const { data: myOrg } = useMyOrg();
  const orgSlug = myOrg?.slug || user?.organizationId || "demo";

  // Jobs for navbar and edit modal
  const { data: rawJobs = [] } = useAllJobs(user?.organizationId);
  const jobsList = useMemo(
    () => rawJobs.map((j) => ({ id: j.id, title: j.title })),
    [rawJobs],
  );

  // Load link details
  const {
    data: detail,
    isLoading,
    isError,
  } = useTrackingLinkDetailQuery(linkId, { timeRange });

  // Real public career site link with full UTM parameters
  const trackingUrl = useMemo(() => {
    if (!detail?.link?.token) return "";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    const jobSlug = detail.link.jobTitle
      ? slugify(detail.link.jobTitle)
      : detail.link.jobId;

    return buildPublicTrackingUrl(origin, orgSlug, detail.link.token, jobSlug, {
      utmSource: detail.link.utmSource,
      utmMedium: detail.link.utmMedium,
      utmCampaign: detail.link.utmCampaign,
      utmTerm: detail.link.utmTerm,
      utmContent: detail.link.utmContent,
    });
  }, [detail?.link, orgSlug]);

  const handleCopy = async () => {
    if (!trackingUrl) return;
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setIsCopied(true);
      toast.success(t("sourcing.links.linkCopied"));
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error(t("common.copy"));
    }
  };

  if (!canViewSourcing) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
        <Navbar activeTab="dashboard" />
        <main className="flex-1 flex flex-col">
          <StatusState
            status="403"
            variant="page"
            actionLabel={t("common.dashboard")}
            actionHref="/dashboard"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      <Navbar
        activeTab="sourcing"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={rawJobs.length}
        candidatesCount={detail?.stats?.applications ?? 0}
      />

      {/* Unified max-w-[1600px] container matching Navbar and list pages */}
      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24 space-y-4">
            <LoadingSpinner />
          </div>
        ) : isError || !detail ? (
          <StatusState
            status="404"
            variant="card"
            title={t("sourcing.details.notFoundTitle")}
            description={t("sourcing.details.notFoundDesc")}
            actionLabel={t("sourcing.details.backToTracking")}
            onAction={() => router.push("/dashboard/source-tracking")}
            actionVariant="outline"
            actionIcon={ArrowLeft}
            className="max-w-md mx-auto my-12"
          />
        ) : (
          <>
            {/* Header */}
            <LinkHeader
              link={detail.link}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onOpenEdit={
                canUpdateLink ? () => setIsEditModalOpen(true) : undefined
              }
              onCopyUrl={handleCopy}
              isCopied={isCopied}
            />

            {/* URL Banner */}
            <LinkUrlBanner
              url={trackingUrl}
              onCopy={handleCopy}
              isCopied={isCopied}
            />

            {/* 5 KPI Metric Cards */}
            <LinkStatsCards stats={detail.stats} />

            {/* Two-Column Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* Left Column (Pipeline + Trend Chart + Attributed Applications) */}
              <div className="lg:col-span-2 space-y-5">
                <LinkPipelineCard
                  breakdown={detail.pipeline.stages}
                  totalApplications={detail.pipeline.total}
                />

                <LinkTrendCard data={detail.applicationsOverTime} />

                <LinkAttributedTable items={detail.attributedApplications} />
              </div>

              {/* Right Column (Link Configuration + Referrer Domains) */}
              <div className="space-y-5">
                <LinkConfigCard link={detail.link} />

                <LinkReferrersCard referrers={detail.referrerDomains} />
              </div>
            </div>

            {/* Edit Modal */}
            <EditLinkModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              link={detail.link}
              jobs={jobsList}
              orgSlug={orgSlug}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default function SourceTrackingDetailPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <TrackingLinkDetailContent />
      </Suspense>
    </AuthGuard>
  );
}
