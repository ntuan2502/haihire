import type { Job, ApplicationStage } from "@/types";

export interface JobListProps {
  jobs: Job[];
  total?: number;
  statusCounts?: {
    all: number;
    published: number;
    draft: number;
    closed: number;
  };
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  loading: boolean;
  onDeleteJob: (jobId: string) => void;
  statusFilter?: string;
  typeFilter?: string;
  expFilter?: string;
  workplaceFilter?: string;
  sortBy?: "created" | "title" | "applicants";
  sortOrder?: "desc" | "asc";
  onFilterChange?: (filters: {
    status?: string;
    type?: string;
    experience?: string;
    workplace?: string;
    sortBy?: "created" | "title" | "applicants";
    sortOrder?: "desc" | "asc";
  }) => void;
}

export interface JobFilterCriteria {
  status?: string[];
  type?: string[];
  exp?: string[];
  workplace?: string[];
  sortBy?: "created" | "title" | "applicants";
  sortOrder?: "desc" | "asc";
}

export interface JobStageCounts {
  new: number;
  screening: number;
  interview: number;
  offer: number;
  hired: number;
  rejected: number;
  byStage: Record<ApplicationStage, number>;
  total: number;
}

export interface VisibleColumns {
  title: boolean;
  status: boolean;
  pipeline: boolean;
  applicants: boolean;
}
