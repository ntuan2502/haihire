"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { SourcingChannel, type TrackingLinkItem } from "@haihire/shared";
import {
  useCreateTrackingLinkMutation,
  useUpdateTrackingLinkMutation,
} from "@/hooks/use-sourcing-queries";
import { Input } from "@/components/ui/input";
import { FormModal, CustomSelect } from "@/components/shared";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
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
  const [source, setSource] = useState<SourcingChannel>(
    SourcingChannel.LINKEDIN,
  );
  const [customSource, setCustomSource] = useState("");
  const [jobId, setJobId] = useState("ALL");

  // 5 UTM Parameters
  const [utmSource, setUtmSource] = useState("linkedin");
  const [utmMedium, setUtmMedium] = useState("social");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [nameInvalid, setNameInvalid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && link) {
        setName(link.name);
        setSource(link.source);
        setCustomSource(link.customSource || "");
        setJobId(lockJob && defaultJobId ? defaultJobId : link.jobId || "ALL");
        setUtmSource(link.utmSource || link.source.toLowerCase());
        setUtmMedium(
          link.utmMedium || link.medium || getDefaultMedium(link.source),
        );
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
      setFormError(null);
      setNameInvalid(false);
    }
  }, [isOpen, isEdit, link, defaultJobId, lockJob]);

  const handleChannelChange = (val: string) => {
    const ch = val as SourcingChannel;
    setSource(ch);
    // Auto-update utm_source and utm_medium only if user hasn't customized them
    if (!utmSource || utmSource === source.toLowerCase()) {
      setUtmSource(ch.toLowerCase());
    }
    if (!utmMedium || utmMedium === getDefaultMedium(source)) {
      setUtmMedium(getDefaultMedium(ch));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNameInvalid(false);

    if (!name.trim()) {
      setNameInvalid(true);
      setFormError(t("sourcing.modal.nameRequired"));
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
            customSource:
              source === SourcingChannel.OTHER
                ? customSource.trim() || null
                : null,
            jobId: effectiveJobId === "ALL" ? null : effectiveJobId,
            utmSource: utmSource.trim() || null,
            utmMedium: utmMedium.trim() || null,
            utmCampaign: utmCampaign.trim() || null,
            utmTerm: utmTerm.trim() || null,
            utmContent: utmContent.trim() || null,
          },
        });
        toast.success(t("sourcing.details.editSuccess"));
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          source,
          customSource:
            source === SourcingChannel.OTHER
              ? customSource.trim() || undefined
              : undefined,
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
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, t);
      setFormError(msg);
      toast.error(msg);
    }
  };

  const channelSelectOptions = CHANNEL_OPTIONS.map((ch) => ({
    value: ch,
    label: (t as (k: string) => string)(`sourcing.channels.${ch}`) || ch,
  }));

  const hasDefaultJob = Boolean(
    defaultJobId && jobs.some((j) => j.id === defaultJobId),
  );
  const normalizedJobs =
    lockJob && defaultJobId && !hasDefaultJob
      ? [{ id: defaultJobId, title: defaultJobId }, ...jobs]
      : jobs;

  const jobSelectOptions = [
    ...(lockJob
      ? []
      : [{ value: "ALL", label: t("sourcing.modal.allJobsOption") }]),
    ...normalizedJobs.map((j) => ({ value: j.id, label: j.title })),
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        isEdit
          ? t("sourcing.details.editTitle")
          : t("sourcing.modal.createTitle")
      }
      description={
        isEdit && link
          ? `${link.name} (${link.token})`
          : t("sourcing.modal.createDesc")
      }
      size="md"
      noValidate={true}
      isSubmitting={isPending}
      submitLabel={
        isEdit ? t("common.saveChanges") : t("sourcing.modal.createBtn")
      }
      savingLabel={
        isEdit ? t("common.saving") : t("sourcing.modal.creatingBtn")
      }
      cancelLabel={t("common.cancel")}
      error={formError}
      bodyClassName="space-y-4"
    >
      {/* Link Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="tracking-link-name-input"
          className="text-xs font-bold text-foreground block"
        >
          {t("sourcing.modal.linkNameLabel")}
          <span className="text-rose-500 ml-1">*</span>
        </label>
        <Input
          id="tracking-link-name-input"
          name="name"
          aria-label={t("sourcing.modal.linkNameLabel")}
          aria-invalid={nameInvalid}
          type="text"
          value={name}
          disabled={isPending}
          placeholder={t("sourcing.modal.linkNamePlaceholder")}
          onChange={(e) => {
            setName(e.target.value);
            if (nameInvalid) setNameInvalid(false);
            if (formError) setFormError(null);
          }}
          className={cn(
            "h-9 text-xs",
            nameInvalid &&
              "border-destructive focus-visible:ring-destructive/30",
          )}
        />
      </div>

      {/* Source Channel */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground block">
          {t("sourcing.modal.sourceLabel")}
        </label>
        <CustomSelect
          value={source}
          options={channelSelectOptions}
          onChange={handleChannelChange}
          disabled={isPending}
          className="w-full"
          triggerClassName="w-full text-xs h-9 bg-background border-input rounded-md"
        />
      </div>

      {/* Custom Source Input when OTHER */}
      {source === SourcingChannel.OTHER && (
        <div className="space-y-1.5">
          <label
            htmlFor="tracking-link-custom-source-input"
            className="text-xs font-bold text-foreground block"
          >
            {t("sourcing.modal.customSourceLabel")}
          </label>
          <Input
            id="tracking-link-custom-source-input"
            name="customSource"
            aria-label={t("sourcing.modal.customSourceLabel")}
            type="text"
            value={customSource}
            disabled={isPending}
            placeholder={t("sourcing.modal.customSourcePlaceholder")}
            onChange={(e) => setCustomSource(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      )}

      {/* Job Scope */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground">
            {t("sourcing.modal.jobLabel")}
          </label>
          {lockJob && (
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t("sourcing.modal.jobLocked")}
            </span>
          )}
        </div>
        <CustomSelect
          value={lockJob && defaultJobId ? defaultJobId : jobId}
          options={jobSelectOptions}
          onChange={setJobId}
          disabled={isPending || lockJob}
          icon={lockJob ? Lock : undefined}
          className="w-full"
          triggerClassName={cn(
            "w-full text-xs h-9 bg-background border-input rounded-md",
            lockJob && "bg-muted/50 opacity-80 cursor-not-allowed",
          )}
        />
      </div>

      {/* UTM Parameters Section */}
      <div className="pt-2 border-t border-border space-y-3">
        <h3 className="text-xs font-bold text-foreground">
          {t("sourcing.details.editUtmAccordion")}
        </h3>

        <div className="space-y-3">
          {/* utm_source & utm_medium */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="tracking-link-utm-source-input"
                className="text-xs font-bold text-foreground block"
              >
                {t("sourcing.details.utmSourceLabel")}
              </label>
              <Input
                id="tracking-link-utm-source-input"
                name="utmSource"
                aria-label={t("sourcing.details.utmSourceLabel")}
                type="text"
                value={utmSource}
                disabled={isPending}
                onChange={(e) => setUtmSource(e.target.value)}
                placeholder="linkedin"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="tracking-link-utm-medium-input"
                className="text-xs font-bold text-foreground block"
              >
                {t("sourcing.details.utmMediumLabel")}
              </label>
              <Input
                id="tracking-link-utm-medium-input"
                name="utmMedium"
                aria-label={t("sourcing.details.utmMediumLabel")}
                type="text"
                value={utmMedium}
                disabled={isPending}
                onChange={(e) => setUtmMedium(e.target.value)}
                placeholder="social"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* utm_campaign & utm_term */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="tracking-link-utm-campaign-input"
                className="text-xs font-bold text-foreground block"
              >
                {t("sourcing.details.utmCampaignLabel")}
              </label>
              <Input
                id="tracking-link-utm-campaign-input"
                name="utmCampaign"
                aria-label={t("sourcing.details.utmCampaignLabel")}
                type="text"
                value={utmCampaign}
                disabled={isPending}
                placeholder={t("sourcing.modal.campaignPlaceholder")}
                onChange={(e) => setUtmCampaign(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="tracking-link-utm-term-input"
                className="text-xs font-bold text-foreground block"
              >
                {t("sourcing.details.utmTermLabel")}
              </label>
              <Input
                id="tracking-link-utm-term-input"
                name="utmTerm"
                aria-label={t("sourcing.details.utmTermLabel")}
                type="text"
                value={utmTerm}
                disabled={isPending}
                placeholder={t("sourcing.details.utmTermPlaceholder")}
                onChange={(e) => setUtmTerm(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* utm_content */}
          <div className="space-y-1.5">
            <label
              htmlFor="tracking-link-utm-content-input"
              className="text-xs font-bold text-foreground block"
            >
              {t("sourcing.details.utmContentLabel")}
            </label>
            <Input
              id="tracking-link-utm-content-input"
              name="utmContent"
              aria-label={t("sourcing.details.utmContentLabel")}
              type="text"
              value={utmContent}
              disabled={isPending}
              placeholder={t("sourcing.details.utmContentPlaceholder")}
              onChange={(e) => setUtmContent(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>
    </FormModal>
  );
}
