import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dtos/global.dto';

export class CreateGroupDto {
  @ApiProperty({
    example: 'Research and Development',
    description: 'Unique name of the group/division',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Focuses on core research initiatives and ecosystem building.',
    description: 'Optional description of the group',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Optional UUID of the parent group (if this is a subgroup)',
  })
  @IsOptional()
  @IsUUID()
  parent_group_id?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the group is a draft structure',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  draft?: boolean;
}

export class UpdateGroupDto {
  @ApiPropertyOptional({
    example: 'Research & Development Department',
    description: 'Updated unique name of the group/division',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description of the division.',
    description: 'Updated description of the group',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Updated parent group ID (pass null to make it a root group)',
  })
  @IsOptional()
  @IsUUID()
  parent_group_id?: string | null;

  @ApiPropertyOptional({
    example: false,
    description: 'Updated draft status',
  })
  @IsOptional()
  @IsBoolean()
  draft?: boolean;
}

export class SearchGroupDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'Research',
    description: 'Search term filtering by name or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Filter by parent group ID',
  })
  @IsOptional()
  @IsUUID()
  parent_group_id?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Filter by draft status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  draft?: boolean;
}
