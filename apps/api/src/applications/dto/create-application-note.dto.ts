import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateApplicationNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
