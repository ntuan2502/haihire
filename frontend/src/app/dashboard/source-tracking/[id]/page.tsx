"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
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
import { ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { TimeRangeFilter } from "@haihire/shared";

function TrackingLinkDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useI18n();

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

  // Load link details
  const {
    data: detail,
    isLoading,
    isError,
  } = useTrackingLinkDetailQuery(linkId, { timeRange });

  // Jobs count for navbar
  const { data: rawJobs = [] } = useAllJobs(user?.organizationId);

  const trackingUrl = useMemo(() => {
    if (!detail?.link?.token) return "";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    return `${origin}/api/public/track/${detail.link.token}`;
  }, [detail?.link?.token]);

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      <Navbar
        activeTab="sourcing"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={rawJobs.length}
        candidatesCount={detail?.stats?.applications ?? 0}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-6 max-w-7xl mx-auto">
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
              onOpenEdit={() => setIsEditModalOpen(true)}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column (Pipeline + Trend Chart + Attributed Applications) */}
              <div className="lg:col-span-2 space-y-6">
                <LinkPipelineCard
                  breakdown={detail.pipeline.stages}
                  totalApplications={detail.pipeline.total}
                />

                <LinkTrendCard data={detail.applicationsOverTime} />

                <LinkAttributedTable items={detail.attributedApplications} />
              </div>

              {/* Right Column (Link Configuration + Referrer Domains) */}
              <div className="space-y-6">
                <LinkConfigCard link={detail.link} />

                <LinkReferrersCard referrers={detail.referrerDomains} />
              </div>
            </div>

            {/* Edit Modal */}
            <EditLinkModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              link={detail.link}
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
