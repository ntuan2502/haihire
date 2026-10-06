"use client";

import { TrackingLinkModal, type JobOption } from "./tracking-link-modal";

export type { JobOption };

export interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobOption[];
  orgSlug?: string;
  defaultJobId?: string;
  lockJob?: boolean;
}

/**
 * CreateLinkModal
 * Clean wrapper around unified TrackingLinkModal with mode="create"
 */
export function CreateLinkModal({
  isOpen,
  onClose,
  jobs,
  orgSlug = "demo",
  defaultJobId,
  lockJob,
}: CreateLinkModalProps) {
  return (
    <TrackingLinkModal
      isOpen={isOpen}
      onClose={onClose}
      mode="create"
      jobs={jobs}
      orgSlug={orgSlug}
      defaultJobId={defaultJobId}
      lockJob={lockJob}
    />
  );
}
