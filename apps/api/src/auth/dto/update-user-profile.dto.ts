import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateUserProfileDto {
  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: "Last name is required" })
  @MaxLength(100)
  lastName!: string;
}
