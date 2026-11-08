import type { Job, Application, ApplicationStage } from "@/types";

export type SortField = "candidate" | "email" | "job" | "status" | "score" | "applied";
export type SortDirection = "asc" | "desc";

export interface ApplicationsDataTableProps {
  applications: Application[];
  jobs: Job[];
  loading?: boolean;
  fixedJobId?: string;
  onViewInPipeline?: (appId: string, stage: ApplicationStage) => void;
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  rowsPerPage?: number;
  search?: string;
  stageFilter?: string;
  stageCounts?: Record<string, number>;
  jobFilter?: string;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSearchChange?: (search: string) => void;
  onStageFilterChange?: (stage?: string) => void;
  onJobFilterChange?: (jobId?: string) => void;
}

export type DrawerTabId =
  | "overview"
  | "inbox"
  | "ai"
  | "interviews"
  | "documents"
  | "responses"
  | "notes"
  | "timeline"
  | "properties";
