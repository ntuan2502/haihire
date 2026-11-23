"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { sourcingApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CareersHeader } from "@/components/careers/careers-header";
import { CareersFooter } from "@/components/careers/careers-footer";
import { JobDetailsHero } from "@/components/careers/job-details-hero";
import { JobDetailsContent } from "@/components/careers/job-details-content";
import { JobPublicApplyForm } from "@/components/careers/job-public-apply-form";
import { useI18n } from "@/i18n";
import type { Job, Organization } from "@/types";

export interface JobDetailsClientProps {
  initialJob: Job;
  initialOrg?: Organization | null;
  orgSlug: string;
  jobSlug: string;
}

export function JobDetailsClient({
  initialJob: job,
  initialOrg: org,
  orgSlug,
  jobSlug: _jobSlug,
}: JobDetailsClientProps) {
  const router = useRouter();
  const { t } = useI18n();
  const nameDisplayOrder =
    org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref");
  const formRef = useRef<HTMLDivElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Record click on public tracking link (with session deduplication)
  useEffect(() => {
    if (refParam) {
      try {
        sessionStorage.setItem("haihire_sourcing_ref", refParam);
        const clickRecordedKey = `haihire_click_recorded_${refParam}`;
        if (!sessionStorage.getItem(clickRecordedKey)) {
          sessionStorage.setItem(clickRecordedKey, "true");
          sourcingApi
            .recordPublicClick({
              token: refParam,
              referrer:
                typeof document !== "undefined" ? document.referrer : undefined,
            })
            .catch(() => {});
        }
      } catch {
        // Ignore storage errors in private browsing
      }
    }
  }, [refParam]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleApplyClick = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (job.status !== "PUBLISHED") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {t("careers.jobClosed.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
          {t("careers.jobClosed.description")}
        </p>
        <Button
          onClick={() => router.push(`/careers/${orgSlug}`)}
          className="mt-6 h-9 rounded-md text-xs font-semibold cursor-pointer"
        >
          {t("careers.jobClosed.viewOtherJobs")}
        </Button>
      </div>
    );
  }

  const orgName = org?.name || "Company";

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground transition-colors duration-200">
      {/* Top Navbar */}
      <CareersHeader
        orgName={orgName}
        orgSlug={orgSlug}
        orgLogoUrl={org?.logoUrl}
        showShareButton={true}
        onShare={handleCopyLink}
        copiedLink={copiedLink}
        shareLabel={t("careers.share")}
      />

      {/* Main Container */}
      <main
        id="main-content"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6"
      >
        {/* Back link */}
        <div>
          <Link
            href={`/careers/${orgSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t("careers.allJobsAt", { org: orgName })}</span>
          </Link>
        </div>

        {/* Job Header Hero Card */}
        <JobDetailsHero
          job={job}
          orgName={orgName}
          orgLogoUrl={org?.logoUrl}
          onApplyClick={handleApplyClick}
        />

        {/* Content & Apply Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <JobDetailsContent job={job} />
          </div>

          <JobPublicApplyForm
            job={job}
            orgName={orgName}
            orgSlug={orgSlug}
            nameDisplayOrder={nameDisplayOrder}
            refParam={refParam}
            formRef={formRef}
          />
        </div>
      </main>

      {/* Footer */}
      <CareersFooter
        orgName={orgName}
        orgSlug={orgSlug}
        orgLogoUrl={org?.logoUrl}
      />
    </div>
  );
}
