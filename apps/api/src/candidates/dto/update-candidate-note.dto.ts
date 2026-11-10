import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateCandidateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
