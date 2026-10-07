"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n";
import {
  SourcingChannel,
  type TrackingLinkItem,
} from "@haihire/shared";
import {
  useCreateTrackingLinkMutation,
  useUpdateTrackingLinkMutation,
} from "@/hooks/use-sourcing-queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/shared/custom-select";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { cn } from "cn";

export interface JobOption {
  id: string;
  title: string;
}

export interface TrackingLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  link?: TrackingLinkItem;
  jobs: JobOption[];
  orgSlug?: string;
  defaultJobId?: string;
  lockJob?: boolean;
}

const CHANNEL_OPTIONS: SourcingChannel[] = [
  SourcingChannel.LINKEDIN,
  SourcingChannel.INDEED,
  SourcingChannel.GOOGLE_JOBS,
  SourcingChannel.CAREER_SITE,
  SourcingChannel.HANDSHAKE,
  SourcingChannel.EMAIL,
  SourcingChannel.REFERRAL,
  SourcingChannel.WE_WORK_REMOTELY,
  SourcingChannel.STACK_OVERFLOW,
  SourcingChannel.TWITTER_X,
  SourcingChannel.REDDIT,
  SourcingChannel.GLASSDOOR,
  SourcingChannel.FACEBOOK,
  SourcingChannel.AGENCY,
  SourcingChannel.OTHER,
];

function getDefaultMedium(channel: SourcingChannel): string {
  switch (channel) {
    case SourcingChannel.LINKEDIN:
    case SourcingChannel.TWITTER_X:
    case SourcingChannel.REDDIT:
    case SourcingChannel.FACEBOOK:
      return "social";
    case SourcingChannel.EMAIL:
      return "email";
    case SourcingChannel.REFERRAL:
      return "referral";
    case SourcingChannel.INDEED:
    case SourcingChannel.GOOGLE_JOBS:
    case SourcingChannel.CAREER_SITE:
    case SourcingChannel.WE_WORK_REMOTELY:
    case SourcingChannel.STACK_OVERFLOW:
    case SourcingChannel.GLASSDOOR:
    case SourcingChannel.HANDSHAKE:
    case SourcingChannel.AGENCY:
    default:
      return "job-board";
  }
}

export function TrackingLinkModal({
  isOpen,
  onClose,
  mode,
  link,
  jobs,
  defaultJobId,
  lockJob = false,
}: TrackingLinkModalProps) {
  const { t } = useI18n();
  const createMutation = useCreateTrackingLinkMutation();
  const updateMutation = useUpdateTrackingLinkMutation();

  const isEdit = mode === "edit" && Boolean(link);

  const [name, setName] = useState("");
  const [source, setSource] = useState<SourcingChannel>(SourcingChannel.LINKEDIN);
  const [customSource, setCustomSource] = useState("");
  const [jobId, setJobId] = useState("ALL");

  // 5 UTM Parameters
  const [utmSource, setUtmSource] = useState("linkedin");
  const [utmMedium, setUtmMedium] = useState("social");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && link) {
        setName(link.name);
        setSource(link.source);
        setCustomSource(link.customSource || "");
        setJobId(lockJob && defaultJobId ? defaultJobId : (link.jobId || "ALL"));
        setUtmSource(link.utmSource || link.source.toLowerCase());
        setUtmMedium(link.utmMedium || link.medium || getDefaultMedium(link.source));
        setUtmCampaign(link.utmCampaign || link.campaign || "");
        setUtmTerm(link.utmTerm || "");
        setUtmContent(link.utmContent || "");
      } else {
        setName("");
        setSource(SourcingChannel.LINKEDIN);
        setCustomSource("");
        setJobId(defaultJobId || "ALL");
        setUtmSource("linkedin");
        setUtmMedium("social");
        setUtmCampaign("");
        setUtmTerm("");
        setUtmContent("");
      }
      setError(null);
    }
  }, [isOpen, isEdit, link, defaultJobId, lockJob]);

  const handleChannelChange = (val: string) => {
    const ch = val as SourcingChannel;
    setSource(ch);
    // Auto-update utm_source and utm_medium if not customized
    if (!utmSource || utmSource === source.toLowerCase()) {
      setUtmSource(ch.toLowerCase());
    }
    setUtmMedium(getDefaultMedium(ch));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("sourcing.modal.nameRequired"));
      return;
    }

    const effectiveJobId = lockJob && defaultJobId ? defaultJobId : jobId;

    try {
      if (isEdit && link) {
        await updateMutation.mutateAsync({
          id: link.id,
          data: {
            name: name.trim(),
            source,
            customSource: source === SourcingChannel.OTHER ? customSource.trim() || null : null,
            jobId: effectiveJobId === "ALL" ? null : effectiveJobId,
            utmSource: utmSource.trim() || undefined,
            utmMedium: utmMedium.trim() || undefined,
            utmCampaign: utmCampaign.trim() || undefined,
            utmTerm: utmTerm.trim() || undefined,
            utmContent: utmContent.trim() || undefined,
          },
        });
        toast.success(t("sourcing.details.editSuccess"));
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          source,
          customSource: source === SourcingChannel.OTHER ? customSource.trim() || undefined : undefined,
          jobId: effectiveJobId === "ALL" ? undefined : effectiveJobId,
          utmSource: utmSource.trim() || undefined,
          utmMedium: utmMedium.trim() || undefined,
          utmCampaign: utmCampaign.trim() || undefined,
          utmTerm: utmTerm.trim() || undefined,
          utmContent: utmContent.trim() || undefined,
        });
        toast.success(t("sourcing.modal.successToast"));
      }
      onClose();
    } catch {
      // Mutation errors handled by global query client
    }
  };

  const channelSelectOptions = CHANNEL_OPTIONS.map((ch) => ({
    value: ch,
    label: (t as (k: string) => string)(`sourcing.channels.${ch}`) || ch,
  }));

  const hasDefaultJob = Boolean(defaultJobId && jobs.some((j) => j.id === defaultJobId));
  const normalizedJobs =
    lockJob && defaultJobId && !hasDefaultJob
      ? [{ id: defaultJobId, title: defaultJobId }, ...jobs]
      : jobs;

  const jobSelectOptions = [
    ...(lockJob ? [] : [{ value: "ALL", label: t("sourcing.modal.allJobsOption") }]),
    ...normalizedJobs.map((j) => ({ value: j.id, label: j.title })),
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-w-0">
          <DialogHeader className="p-6 pb-4 space-y-1.5 text-left border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {isEdit
                ? t("sourcing.details.editTitle")
                : t("sourcing.modal.createTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {isEdit && link
                ? `${link.name} (${link.token})`
                : t("sourcing.modal.createDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-w-0">
            {/* Link Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("sourcing.modal.linkNameLabel")}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={name}
                placeholder={t("sourcing.modal.linkNamePlaceholder")}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  error
                    ? "border-rose-300 dark:border-rose-700"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              />
              {error && <p className="text-[11px] text-rose-500">{error}</p>}
            </div>

            {/* Source Channel */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("sourcing.modal.sourceLabel")}
              </label>
              <CustomSelect
                value={source}
                options={channelSelectOptions}
                onChange={handleChannelChange}
                className="w-full"
                triggerClassName="w-full text-xs h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            {/* Custom Source Input when OTHER */}
            {source === SourcingChannel.OTHER && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("sourcing.modal.customSourceLabel")}
                </label>
                <input
                  type="text"
                  value={customSource}
                  placeholder={t("sourcing.modal.customSourcePlaceholder")}
                  onChange={(e) => setCustomSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            )}

            {/* Job Scope */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("sourcing.modal.jobLabel")}
                </label>
                {lockJob && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {t("sourcing.modal.jobLocked")}
                  </span>
                )}
              </div>
              <CustomSelect
                value={lockJob && defaultJobId ? defaultJobId : jobId}
                options={jobSelectOptions}
                onChange={setJobId}
                disabled={lockJob}
                icon={lockJob ? Lock : undefined}
                className="w-full"
                triggerClassName={cn(
                  "w-full text-xs h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl",
                  lockJob && "bg-slate-50/80 dark:bg-slate-800/50 opacity-80 cursor-not-allowed"
                )}
              />
            </div>

            {/* UTM Parameters Section (Always visible, matching standard input style) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("sourcing.details.editUtmAccordion")}
              </h3>

              <div className="space-y-3">
                {/* utm_source & utm_medium */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t("sourcing.details.utmSourceLabel")}
                    </label>
                    <input
                      type="text"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      placeholder="linkedin"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t("sourcing.details.utmMediumLabel")}
                    </label>
                    <input
                      type="text"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                      placeholder="social"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* utm_campaign & utm_term */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t("sourcing.details.utmCampaignLabel")}
                    </label>
                    <input
                      type="text"
                      value={utmCampaign}
                      placeholder={t("sourcing.modal.campaignPlaceholder")}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t("sourcing.details.utmTermLabel")}
                    </label>
                    <input
                      type="text"
                      value={utmTerm}
                      placeholder={t("sourcing.details.utmTermPlaceholder")}
                      onChange={(e) => setUtmTerm(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* utm_content */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t("sourcing.details.utmContentLabel")}
                  </label>
                  <input
                    type="text"
                    value={utmContent}
                    placeholder={t("sourcing.details.utmContentPlaceholder")}
                    onChange={(e) => setUtmContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer - Perfectly aligned buttons */}
          <div className="p-4 px-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="h-9 px-4 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              {t("sourcing.modal.cancelBtn")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              {isPending
                ? isEdit
                  ? t("sourcing.details.editSaving")
                  : t("sourcing.modal.creatingBtn")
                : isEdit
                  ? t("sourcing.details.editSave")
                  : t("sourcing.modal.createBtn")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
