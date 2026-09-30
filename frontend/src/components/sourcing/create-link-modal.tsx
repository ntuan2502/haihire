"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { SourcingChannel } from "@haihire/shared";
import { useCreateTrackingLinkMutation } from "@/hooks/use-sourcing-queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link2, Sparkles, Check, Copy } from "lucide-react";

interface JobOption {
  id: string;
  title: string;
}

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobOption[];
  orgSlug: string;
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

export function CreateLinkModal({
  isOpen,
  onClose,
  jobs,
  orgSlug,
}: CreateLinkModalProps) {
  const { t } = useI18n();
  const createMutation = useCreateTrackingLinkMutation();

  const [name, setName] = useState("");
  const [source, setSource] = useState<SourcingChannel>(SourcingChannel.LINKEDIN);
  const [customSource, setCustomSource] = useState("");
  const [jobId, setJobId] = useState("");
  const [campaign, setCampaign] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const resetForm = () => {
    setName("");
    setSource(SourcingChannel.LINKEDIN);
    setCustomSource("");
    setJobId("");
    setCampaign("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewJobPath = jobId ? `/${jobId}` : "";
  const previewUrl = `${origin}/careers/${orgSlug}${previewJobPath}?ref=lnk-...`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("sourcing.modal.nameRequired"));
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        source,
        customSource: source === SourcingChannel.OTHER ? customSource.trim() || undefined : undefined,
        jobId: jobId || undefined,
        campaign: campaign.trim() || undefined,
      });
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating link");
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewUrl).then(() => {
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Link2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {t("sourcing.modal.createTitle")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed">
            {t("sourcing.modal.createDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Link Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("sourcing.modal.linkNameLabel")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t("sourcing.modal.linkNamePlaceholder")}
              className="h-9 w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Source Channel Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("sourcing.modal.sourceLabel")}
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as SourcingChannel)}
              className="h-9 w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              {CHANNEL_OPTIONS.map((ch) => (
                <option key={ch} value={ch}>
                  {(t as (key: string) => string)(`sourcing.channels.${ch}`) || ch}
                </option>
              ))}
            </select>
          </div>

          {/* Custom source name if OTHER */}
          {source === SourcingChannel.OTHER && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("sourcing.modal.customSourceLabel")}
              </label>
              <input
                type="text"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder={t("sourcing.modal.customSourcePlaceholder")}
                className="h-9 w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          )}

          {/* Target Job */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("sourcing.modal.jobLabel")}
            </label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="h-9 w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="">{t("sourcing.modal.allJobsOption")}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {/* Campaign Tag (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("sourcing.modal.campaignLabel")}
            </label>
            <input
              type="text"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder={t("sourcing.modal.campaignPlaceholder")}
              className="h-9 w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* URL Preview */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>{t("sourcing.modal.previewLabel")}</span>
              <button
                type="button"
                onClick={handleCopyPreview}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
              >
                {copiedPreview ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>{t("common.copied")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>{t("common.copy")}</span>
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
              {previewUrl}
            </p>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-9 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {t("sourcing.modal.cancelBtn")}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="h-9 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {createMutation.isPending
                  ? t("sourcing.modal.creatingBtn")
                  : t("sourcing.modal.createBtn")}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
