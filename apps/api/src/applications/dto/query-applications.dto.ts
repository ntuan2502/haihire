import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export const APPLICATION_SCORE_FILTERS = ["80", "60", "BELOW_60"] as const;
export type ApplicationScoreFilter = (typeof APPLICATION_SCORE_FILTERS)[number];

export const APPLICATION_SORT_FIELDS = [
  "candidate",
  "email",
  "job",
  "status",
  "score",
  "applied",
] as const;
export type ApplicationSortBy = (typeof APPLICATION_SORT_FIELDS)[number];

export class QueryApplicationsDto {
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

  @IsUUID()
  @IsOptional()
  jobId?: string;

  @IsString()
  @IsOptional()
  stage?: string;

  @IsIn(APPLICATION_SCORE_FILTERS)
  @IsOptional()
  score?: ApplicationScoreFilter;

  @IsIn(APPLICATION_SORT_FIELDS)
  @IsOptional()
  sortBy?: ApplicationSortBy;

  @IsIn(["asc", "desc"])
  @IsOptional()
  sortOrder?: "asc" | "desc";
}
