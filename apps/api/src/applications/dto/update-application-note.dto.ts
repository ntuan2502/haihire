import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateApplicationNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
