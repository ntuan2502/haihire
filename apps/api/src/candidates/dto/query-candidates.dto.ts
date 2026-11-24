import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export const CANDIDATE_SORT_FIELDS = [
  "name",
  "email",
  "phone",
  "applications",
  "added",
] as const;

export type CandidateSortBy = (typeof CANDIDATE_SORT_FIELDS)[number];

export class QueryCandidatesDto {
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  filter?: string;

  @IsUUID()
  @IsOptional()
  jobId?: string;

  @IsIn(CANDIDATE_SORT_FIELDS)
  @IsOptional()
  sortBy?: CandidateSortBy;

  @IsIn(["asc", "desc"])
  @IsOptional()
  sortOrder?: "asc" | "desc";
}
