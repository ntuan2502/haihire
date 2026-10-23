import "reflect-metadata";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  ValidateNested,
} from "class-validator";
import { PERMISSION_LIST, type Permission } from "@haihire/shared";

export class RolePermissionItemDto {
  @IsIn(PERMISSION_LIST, {
    message: "Invalid permission key",
  })
  @IsNotEmpty({ message: "Permission is required" })
  permission!: Permission;

  @IsBoolean({ message: "Granted must be a boolean" })
  granted!: boolean;
}

export class UpdateRolePermissionsDto {
  @IsArray({ message: "Permissions must be an array" })
  @ArrayNotEmpty({ message: "Permissions array cannot be empty" })
  @ValidateNested({ each: true })
  @Type(() => RolePermissionItemDto)
  permissions!: RolePermissionItemDto[];
}
