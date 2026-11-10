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
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Radio } from "lucide-react";
import { toast } from "sonner";
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
        <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 max-w-xl mx-auto flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-xs">
            <Radio className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("common.accessDenied")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md">
            {t("errors.FORBIDDEN_READ_ONLY")}
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="mt-6 h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            {t("common.dashboard")}
          </Button>
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

      {/* Full-width container per HaiHire design system mandate (no max-w-7xl) */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24 space-y-4">
            <LoadingSpinner />
          </div>
        ) : isError || !detail ? (
          <div className="p-12 text-center space-y-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md mx-auto my-12">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t("sourcing.details.notFoundTitle")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("sourcing.details.notFoundDesc")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/source-tracking")}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              <span>{t("sourcing.details.backToTracking")}</span>
            </Button>
          </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
              {/* Left Column (Pipeline + Trend Chart + Attributed Applications) */}
              <div className="lg:col-span-2 space-y-4">
                <LinkPipelineCard
                  breakdown={detail.pipeline.stages}
                  totalApplications={detail.pipeline.total}
                />

                <LinkTrendCard data={detail.applicationsOverTime} />

                <LinkAttributedTable items={detail.attributedApplications} />
              </div>

              {/* Right Column (Link Configuration + Referrer Domains) */}
              <div className="space-y-4">
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
