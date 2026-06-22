import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class ChangeEmployeePasswordDto {
  @ApiProperty({
    example: 'StrongP@ss123',
    description: 'Password for the employee account',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
  })
  old_password?: string;

  @ApiProperty({
    example: 'StrongP@ss123',
    description: 'Password for the employee account',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
  })
  password?: string;
}

export class ChangeOtherEmployeePasswordDto {
  @ApiProperty({
    example: 'Employee id',
    required: false,
  })
  @IsString()
  employee_id: string;

  @ApiProperty({
    example: 'StrongP@ss123',
    description: 'Password for the employee account',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
  })
  password?: string;
}
