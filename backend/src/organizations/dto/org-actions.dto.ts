import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Role } from "@haihire/shared";

export class SwitchOrgDto {
  @IsString()
  @IsNotEmpty({ message: "Organization ID is required" })
  organizationId!: string;
}

export class UpdateMemberRoleDto {
  @IsIn(
    [
      Role.ADMIN,
      Role.RECRUITER,
      Role.HIRING_MANAGER,
      Role.INTERVIEWER,
      Role.MEMBER,
    ],
    {
      message:
        "Role must be one of: ADMIN, RECRUITER, HIRING_MANAGER, INTERVIEWER, MEMBER",
    },
  )
  @IsNotEmpty({ message: "Role is required" })
  role!: Role;
}

export class CreateInviteLinkDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  expiresIn?: string;

  @IsOptional()
  @IsString()
  maxUses?: string;
}
