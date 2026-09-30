"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n";
import { SourcingChannel, type TrackingLinkItem } from "@haihire/shared";
import { useUpdateTrackingLinkMutation } from "@/hooks/use-sourcing-queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/shared/custom-select";
import { ChevronDown, ChevronUp } from "lucide-react";

interface JobOption {
  id: string;
  title: string;
}

interface EditLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: TrackingLinkItem;
  jobs?: JobOption[];
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

export function EditLinkModal({
  isOpen,
  onClose,
  link,
  jobs = [],
}: EditLinkModalProps) {
  const { t } = useI18n();
  const updateMutation = useUpdateTrackingLinkMutation();

  const [name, setName] = useState(link.name);
  const [source, setSource] = useState<SourcingChannel>(link.source);
  const [selectedJobId, setSelectedJobId] = useState<string>(
    link.jobId || "ALL",
  );
  const [isActive, setIsActive] = useState<boolean>(link.isActive);

  // 5 UTM Parameters
  const [isUtmExpanded, setIsUtmExpanded] = useState(true);
  const [utmSource, setUtmSource] = useState(
    link.utmSource || link.source.toLowerCase(),
  );
  const [utmMedium, setUtmMedium] = useState(
    link.utmMedium || link.medium || "social",
  );
  const [utmCampaign, setUtmCampaign] = useState(
    link.utmCampaign || link.campaign || "",
  );
  const [utmTerm, setUtmTerm] = useState(link.utmTerm || "");
  const [utmContent, setUtmContent] = useState(link.utmContent || "");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(link.name);
      setSource(link.source);
      setSelectedJobId(link.jobId || "ALL");
      setIsActive(link.isActive);
      setUtmSource(link.utmSource || link.source.toLowerCase());
      setUtmMedium(link.utmMedium || link.medium || "social");
      setUtmCampaign(link.utmCampaign || link.campaign || "");
      setUtmTerm(link.utmTerm || "");
      setUtmContent(link.utmContent || "");
      setError(null);
    }
  }, [isOpen, link]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("sourcing.modal.nameRequired"));
      return;
    }

    updateMutation.mutate(
      {
        id: link.id,
        data: {
          name: name.trim(),
          source,
          jobId: selectedJobId === "ALL" ? null : selectedJobId,
          utmSource: utmSource.trim() || undefined,
          utmMedium: utmMedium.trim() || undefined,
          utmCampaign: utmCampaign.trim() || undefined,
          utmTerm: utmTerm.trim() || undefined,
          utmContent: utmContent.trim() || undefined,
          isActive,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const channelSelectOptions = CHANNEL_OPTIONS.map((ch) => ({
    value: ch,
    label: (t as (k: string) => string)(`sourcing.channels.${ch}`) || ch,
  }));

  const jobSelectOptions = [
    { value: "ALL", label: t("sourcing.modal.allJobsOption") },
    ...jobs.map((j) => ({ value: j.id, label: j.title })),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="p-6 pb-4 space-y-1.5 text-left border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {t("sourcing.details.editTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {link.name} ({link.token})
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Link Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("sourcing.details.editNameLabel")}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={name}
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
                {t("sourcing.details.editSourceChannelLabel")}
              </label>
              <CustomSelect
                value={source}
                options={channelSelectOptions}
                onChange={(val) => {
                  const ch = val as SourcingChannel;
                  setSource(ch);
                  if (!utmSource || utmSource === source.toLowerCase()) {
                    setUtmSource(ch.toLowerCase());
                  }
                }}
                className="w-full"
                triggerClassName="w-full text-xs h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            {/* Target Job Scope (if jobs provided) */}
            {jobs.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("sourcing.details.editJobLabel")}
                </label>
                <CustomSelect
                  value={selectedJobId}
                  options={jobSelectOptions}
                  onChange={setSelectedJobId}
                  className="w-full"
                  triggerClassName="w-full text-xs h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>
            )}

            {/* UTM Parameters Accordion */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <button
                type="button"
                onClick={() => setIsUtmExpanded((prev) => !prev)}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <span>{t("sourcing.details.editUtmAccordion")}</span>
                {isUtmExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {isUtmExpanded && (
                <div className="space-y-3 pt-1">
                  {/* utm_source & utm_medium */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {t("sourcing.details.utmSourceLabel")}
                      </label>
                      <input
                        type="text"
                        value={utmSource}
                        onChange={(e) => setUtmSource(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {t("sourcing.details.utmMediumLabel")}
                      </label>
                      <input
                        type="text"
                        value={utmMedium}
                        onChange={(e) => setUtmMedium(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* utm_campaign & utm_term */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {t("sourcing.details.utmCampaignLabel")}
                      </label>
                      <input
                        type="text"
                        value={utmCampaign}
                        onChange={(e) => setUtmCampaign(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {t("sourcing.details.utmTermLabel")}
                      </label>
                      <input
                        type="text"
                        value={utmTerm}
                        placeholder={t("sourcing.details.utmTermPlaceholder")}
                        onChange={(e) => setUtmTerm(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* utm_content */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {t("sourcing.details.utmContentLabel")}
                    </label>
                    <input
                      type="text"
                      value={utmContent}
                      placeholder={t("sourcing.details.utmContentPlaceholder")}
                      onChange={(e) => setUtmContent(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 px-6 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="h-9 px-4 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              {t("sourcing.modal.cancelBtn")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
              className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              {updateMutation.isPending
                ? t("sourcing.details.editSaving")
                : t("sourcing.details.editSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
