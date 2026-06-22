import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RolePermissionResourceActionDto {
  @ApiProperty()
  @IsString()
  permission_action_id: string;
}

export class RolePermissionResourceDto {
  @ApiProperty()
  @IsString()
  permission_resource_id: string;

  @ApiProperty({ type: [RolePermissionResourceActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionResourceActionDto)
  rolePermissionResourceActions: RolePermissionResourceActionDto[];
}

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  switchable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  editable?: boolean;

  @ApiProperty({ type: [RolePermissionResourceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionResourceDto)
  rolePermissionResources: RolePermissionResourceDto[];
}

export class SearchRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}
