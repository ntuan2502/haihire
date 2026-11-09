import { IsDefined } from "class-validator";

export class SubmitScorecardDto {
  @IsDefined()
  scorecard!: Record<string, unknown> | string;
}
