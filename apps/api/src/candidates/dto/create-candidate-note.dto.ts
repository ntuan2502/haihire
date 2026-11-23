import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateCandidateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
