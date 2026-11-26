import { matchesPersonNameSearch } from "@haihire/shared";
import type { Application, ApplicationStage, CandidateDocument } from "@/types";
import {
  fixUtf8String,
  getCandidateDisplayName,
  parseCandidateDocuments,
} from "@/lib/utils";
import { downloadAuthenticatedFile } from "@/lib/api";

export type PipelineSortOption = "score" | "newest" | "oldest" | "name";

/**
 * Counts applications grouped by their high-level ATS stage category.
 */
export function computePipelineStageCounts(
  jobApplications: Application[],
): Record<ApplicationStage, number> {
  const counts: Record<ApplicationStage, number> = {
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    OFFER: 0,
    HIRED: 0,
    REJECTED: 0,
  };
  for (const app of jobApplications) {
    if (counts[app.stage] !== undefined) {
      counts[app.stage]++;
    }
  }
  return counts;
}

/**
 * Filters and sorts job applications belonging to the active pipeline stage.
 */
export function filterAndSortPipelineApplications(
  jobApplications: Application[],
  selectedStage: ApplicationStage,
  searchQuery: string,
  sortBy: PipelineSortOption,
): Application[] {
  return jobApplications
    .filter((app) => app.stage === selectedStage)
    .filter((app) => {
      if (!searchQuery.trim()) return true;
      return matchesPersonNameSearch(
        {
          firstName: app.candidate?.firstName,
          lastName: app.candidate?.lastName,
          displayName: app.candidate?.displayName,
          name: getCandidateDisplayName(app),
          candidateName: app.candidateName,
          email: app.candidateEmail,
        },
        searchQuery,
      );
    })
    .sort((a, b) => {
      if (sortBy === "score") {
        const scoreA = (a as unknown as { matchScore?: number }).matchScore;
        const scoreB = (b as unknown as { matchScore?: number }).matchScore;
        if (
          scoreA !== undefined &&
          scoreA !== null &&
          scoreB !== undefined &&
          scoreB !== null &&
          scoreA !== scoreB
        ) {
          return scoreB - scoreA;
        }
        if (
          (scoreA === undefined || scoreA === null) &&
          scoreB !== undefined &&
          scoreB !== null
        ) {
          return 1;
        }
        if (
          scoreA !== undefined &&
          scoreA !== null &&
          (scoreB === undefined || scoreB === null)
        ) {
          return -1;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortBy === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortBy === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      if (sortBy === "name") {
        return getCandidateDisplayName(a).localeCompare(
          getCandidateDisplayName(b),
        );
      }
      return 0;
    });
}

/**
 * Collects candidate documents belonging strictly to the selected application.
 */
export function collectPipelineCandidateDocuments(
  selectedCandidate: Application | null,
  _jobApplications?: Application[],
): CandidateDocument[] {
  if (!selectedCandidate) return [];
  return parseCandidateDocuments({
    id: selectedCandidate.id,
    resumeUrl: selectedCandidate.resumeUrl,
    resumeFileName: selectedCandidate.resumeFileName,
    resumeFileSize: selectedCandidate.resumeFileSize,
    resumeMimeType: selectedCandidate.resumeMimeType,
    createdAt: selectedCandidate.createdAt,
  }).map((doc) => ({ ...doc, sourceApplicationId: selectedCandidate.id }));
}

/**
 * Downloads an authenticated candidate document via the applications API.
 */
export async function downloadPipelineCandidateDocument(
  url: string,
  filename: string | undefined,
  activeAppId: string | undefined,
  onMissingApp: () => void,
  onError: (err: unknown) => void,
): Promise<void> {
  const downloadFileName = fixUtf8String(filename || "document.pdf");
  const queryParams = new URLSearchParams();
  if (url) queryParams.set("url", url);
  if (downloadFileName) queryParams.set("name", downloadFileName);
  const queryString = queryParams.toString()
    ? `?${queryParams.toString()}`
    : "";

  if (!activeAppId) {
    onMissingApp();
    return;
  }

  try {
    await downloadAuthenticatedFile(
      `/applications/${activeAppId}/documents/download${queryString}`,
      downloadFileName,
    );
  } catch (err) {
    onError(err);
  }
}
