"use client";

import type { TrackingLinkItem } from "@haihire/shared";
import { TrackingLinkModal, type JobOption } from "../tracking-link-modal";

export type { JobOption };

export interface EditLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: TrackingLinkItem;
  jobs?: JobOption[];
  orgSlug?: string;
  defaultJobId?: string;
  lockJob?: boolean;
}

/**
 * EditLinkModal
 * Clean wrapper around unified TrackingLinkModal with mode="edit"
 */
export function EditLinkModal({
  isOpen,
  onClose,
  link,
  jobs = [],
  orgSlug = "demo",
  defaultJobId,
  lockJob,
}: EditLinkModalProps) {
  return (
    <TrackingLinkModal
      isOpen={isOpen}
      onClose={onClose}
      mode="edit"
      link={link}
      jobs={jobs}
      orgSlug={orgSlug}
      defaultJobId={defaultJobId}
      lockJob={lockJob}
    />
  );
}
