import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/global.dto';

export * from './create-employee.dto';
export * from './update-employee.dto';
export * from './employee-response.dto';
export * from './public-employee-profile.dto';
export * from './employee-activation.dto';
export * from './change-employee-password.dto';

export class SearchEmployeeDto extends PartialType(PaginationDto) {
  @ApiProperty()
  @IsOptional()
  search?: string;

  @ApiProperty()
  @IsOptional()
  group_id?: string;

  @ApiProperty()
  @IsOptional()
  role_id?: string;

  @ApiProperty()
  @IsOptional()
  is_supervisor?: string;

  @ApiProperty()
  @IsOptional()
  is_active?: string;

  @ApiProperty()
  @IsOptional()
  is_suspended?: string;
}
