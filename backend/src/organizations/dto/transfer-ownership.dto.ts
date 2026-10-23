import { IsNotEmpty, IsString } from "class-validator";

export class TransferOwnershipDto {
  @IsString({ message: "newOwnerUserId must be a valid string" })
  @IsNotEmpty({ message: "New owner user ID is required" })
  newOwnerUserId!: string;
}
