import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePartnerDto {
  @ApiProperty({ example: 'United Nations Development Programme', description: 'Name of the partner organization' })
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdatePartnerDto {
  @ApiProperty({ example: 'UNDP', description: 'Updated name of the partner organization', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

export class SearchPartnerDto {
  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 10, required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ example: 'UNDP', required: false, description: 'Search term for name' })
  @IsOptional()
  @IsString()
  search?: string;
}
