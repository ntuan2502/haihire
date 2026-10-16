import { useCallback } from "react";
import type { Job, ApplicationStage } from "@/types";
import type { JobStageCounts } from "../types";

export function useJobStageCounts(jobs: Job[]) {
  const getJobStageCounts = useCallback(
    (jobId: string): JobStageCounts => {
      const job = jobs.find((j) => j.id === jobId);
      const byStage = (job?.applicationsByStage || {}) as Record<string, number>;
      return {
        new: byStage.APPLIED || 0,
        screening: byStage.SCREENING || 0,
        interview: byStage.INTERVIEW || 0,
        offer: byStage.OFFER || 0,
        hired: byStage.HIRED || 0,
        rejected: byStage.REJECTED || 0,
        byStage: byStage as Record<ApplicationStage, number>,
        total: job?.applicationsCount || 0,
      };
    },
    [jobs],
  );

  return { getJobStageCounts };
}
