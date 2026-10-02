import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { type ActivityType } from "../activities.service";

export class CreateActivityRecordDto {
  @IsString()
  @IsNotEmpty({ message: "Candidate ID is required" })
  candidateId!: string;

  @IsOptional()
  @IsString()
  applicationId?: string | null;

  @IsIn(
    [
      "APPLIED",
      "STAGE_CHANGED",
      "EMAIL_SENT",
      "INTERVIEW_SCHEDULED",
      "INTERVIEW_UPDATED",
      "SCORECARD_SUBMITTED",
      "NOTE_ADDED",
    ],
    { message: "Invalid activity type" },
  )
  type!: ActivityType;

  @IsString()
  @IsNotEmpty({ message: "Title is required" })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: "Description is required" })
  description!: string;

  @IsOptional()
  metadata?: Record<string, unknown> | null;
}
