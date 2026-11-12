import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: "Last name is required" })
  @MaxLength(100)
  lastName!: string;

  @IsEmail({}, { message: "Invalid email format" })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password!: string;
}
