import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { PaginationDto } from '../../../common/dtos/global.dto';

export class EmployeeLoginDto {
  @ApiProperty({
    example: 'dayone',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
  })
  password?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  lat?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  long?: string;
}

export class EmployeeAuthResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  email?: string;

  @Expose()
  @ApiProperty()
  require_password_change: boolean;

  @Expose()
  @ApiProperty()
  is_active: boolean;

  @Expose()
  @ApiProperty()
  is_suspended: boolean;

  @Expose()
  @ApiProperty()
  username_verified: boolean;

  @Expose()
  @ApiProperty()
  userRoles?: any[];

  @Expose()
  @ApiProperty()
  resourcePermissions?: any[];

  @Expose()
  @ApiProperty()
  server_time?: Date;

  // Explicitly exclude sensitive fields
  @Exclude()
  password: string;

  @Exclude()
  code_hash: string;

  @Exclude()
  code_expiration: Date;
}

export class EmployeeLoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: EmployeeAuthResponseDto })
  user: EmployeeAuthResponseDto;
}

// Change Password DTOs
export class EmployeeChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'CurrentPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (must be at least 8 characters long, contain uppercase, lowercase, number, and special character)',
    example: 'NewPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}

export class EmployeeChangePasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password changed successfully',
  })
  message: string;
}

// Forget Password DTOs
export class EmployeeForgetPasswordDto {
  @ApiProperty({
    description: 'Username',
    example: 'employee123',
  })
  @IsNotEmpty()
  @IsString()
  username: string;
}

export class EmployeeForgetPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password reset OTP sent to your phone',
  })
  message: string;
}

export class EmployeeResetPasswordDto {
  @ApiProperty({
    description: 'Username',
    example: 'employee123',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits',
  })
  otp: string;

  @ApiProperty({
    description:
      'New password (must be at least 8 characters long, contain uppercase, lowercase, number, and special character)',
    example: 'NewPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}

export class EmployeeResetPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password reset successfully',
  })
  message: string;
}

export class EmployeeLoginHistorySearchDto extends PartialType(PaginationDto) {
  @ApiProperty({
    description: 'Search by employee ID',
    example: '123',
  })
  @IsOptional()
  @IsString()
  employee_id: string;

  @ApiProperty({
    description: 'Search by IP address',
    example: '127.0.0.1',
  })
  @IsOptional()
  @IsString()
  ip_address: string;

  @ApiProperty({
    description: 'Search by date from',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  date_from: string;

  @ApiProperty({
    description: 'Search by date to',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  date_to: string;

  @ApiProperty({
    description: 'Search by employee name or username',
    example: 'John Doe or john.doe',
  })
  @IsOptional()
  search: string;
}
