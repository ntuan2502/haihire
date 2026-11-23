import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RecordClickDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsOptional()
  referrer?: string;
}
