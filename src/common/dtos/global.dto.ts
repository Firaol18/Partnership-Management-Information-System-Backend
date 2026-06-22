import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SortDirection {
  DES = 'DES',
  ASC = 'ASC',
}

export class PaginationDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ maximum: 10000 })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @Max(10000)
  limit?: number = 10;

  @IsOptional()
  sort_by: string = 'created_at';

  @IsEnum(SortDirection, {
    message: 'sort_direction must be either DES or ASC',
  })
  @IsOptional()
  sort_direction?: SortDirection = SortDirection.DES;
}
