import { IsNotEmpty, IsString } from "class-validator";

export class JoinOrgDto {
  @IsString()
  @IsNotEmpty({ message: "Invite code or organization slug is required" })
  inviteCodeOrSlug!: string;
}
