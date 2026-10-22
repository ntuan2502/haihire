import { IsNotEmpty, IsUUID } from "class-validator";

export class TransferOwnershipDto {
  @IsUUID(undefined, { message: "newOwnerUserId must be a valid UUID" })
  @IsNotEmpty({ message: "New owner user ID is required" })
  newOwnerUserId!: string;
}
