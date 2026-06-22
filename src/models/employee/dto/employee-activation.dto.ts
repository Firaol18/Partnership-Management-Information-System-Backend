import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeactivateEmployeeDto {
  @ApiProperty({
    example: 'Reason for deactivation',
    description: 'Reason for deactivation',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ActivateEmployeeDto {
  @ApiProperty({
    example: 'Reason for deactivation',
    description: 'Reason for deactivation',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
