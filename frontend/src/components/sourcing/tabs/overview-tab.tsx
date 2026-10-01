"use client";

import type { SourcingStats } from "@haihire/shared";
import { ApplicationsBySource } from "../overview/applications-by-source";
import { TopLinksCard } from "../overview/top-links-card";
import { TopReferrersCard } from "../overview/top-referrers-card";
import { RecentAttributedCard } from "../overview/recent-attributed-card";
import { ConversionBySource } from "../overview/conversion-by-source";

interface OverviewTabProps {
  stats?: SourcingStats;
  isLoading?: boolean;
  onNavigateToLinks?: () => void;
  onNavigateToAttribution?: () => void;
}

export function OverviewTab({
  stats,
  isLoading,
  onNavigateToLinks,
  onNavigateToAttribution,
}: OverviewTabProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
        <div className="lg:col-span-7 space-y-6">
          <div className="h-96 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60" />
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60" />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60" />
          <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60" />
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60" />
        </div>
      </div>
    );
  }

  const channelBreakdown = stats?.channelBreakdown ?? [];
  const totalApplications = stats?.totalApplications ?? 0;
  const topLinks = stats?.topLinks ?? [];
  const topReferrers = stats?.topReferrers ?? [];
  const recentAttributed = stats?.recentAttributed ?? [];
  const conversionBySource = stats?.conversionBySource ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column (7 cols): Applications by Source + Conversion by Source */}
      <div className="lg:col-span-7 space-y-6">
        <ApplicationsBySource
          data={channelBreakdown}
          totalApplications={totalApplications}
        />
        <ConversionBySource data={conversionBySource} />
      </div>

      {/* Right Column (5 cols): Top Links + Top Referrers + Recent Attributed */}
      <div className="lg:col-span-5 space-y-6">
        <TopLinksCard links={topLinks} onViewAll={onNavigateToLinks} />
        <TopReferrersCard referrers={topReferrers} />
        <RecentAttributedCard
          candidates={recentAttributed}
          onViewAll={onNavigateToAttribution}
        />
      </div>
    </div>
  );
}
