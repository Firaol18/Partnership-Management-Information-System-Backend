import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsEmail,
  Length,
} from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { IsPhoneNumber } from '../../../common/decorators/is-phone-number.decorator';

export class LoginDto {
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

export class UserResponseDto {
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
  @ApiProperty({
    description: 'User phone number',
    example: '+251911234567',
  })
  phone_number?: string;

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
  server_time?: Date;

  // Explicitly exclude sensitive fields
  @Exclude()
  password: string;

  @Exclude()
  code_hash: string;

  @Exclude()
  code_expiration: Date;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

// Flow A: Normal signup DTOs
export class SignupDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    description: 'Username (must be unique)',
    example: 'johndoe',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username: string;

  @ApiProperty({
    description: 'Phone number (must be unique)',
    example: '+251911234567',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format',
  })
  phone_number: string;

  @ApiProperty({
    description: 'Email address (optional)',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description:
      'Password (must be at least 8 characters long, contain uppercase, lowercase, number, and special character)',
    example: 'MyPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
  })
  password: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Username or phone number',
    example: 'johndoe',
  })
  @IsNotEmpty()
  @IsString()
  usernameOrPhone: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits',
  })
  otp: string;
}

export class SignupResponseDto {
  @ApiProperty({
    description: 'Success message',
    example:
      'User registered successfully. Please verify your account with the OTP sent to your phone.',
  })
  message: string;
}

export class VerifyOtpResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Account verified successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Login response with tokens',
    type: LoginResponseDto,
  })
  loginResponse: LoginResponseDto;
}

// Change Password DTOs
export class ChangePasswordDto {
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

export class ChangePasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password changed successfully',
  })
  message: string;
}

// Forget Password DTOs
export class ForgetPasswordDto {
  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
  })
  @IsNotEmpty()
  @IsString()
  usernameOrPhone: string;
}

export class ForgetPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password reset OTP sent to your phone',
  })
  message: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
  })
  @IsNotEmpty()
  @IsString()
  usernameOrPhone: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
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

export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password reset successfully',
  })
  message: string;
}

// Change Phone Number DTOs
export class ChangePhoneNumberRequestDto {
  @ApiProperty({
    description: 'New phone number to change to',
    example: '+251911234567',
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber()
  newPhoneNumber: string;
}

export class ChangePhoneNumberVerifyDto {
  @ApiProperty({
    description: 'OTP received via SMS to the new phone number',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({
    description:
      'New phone number to change to (must match the one used in request)',
    example: '+251911234567',
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber()
  newPhoneNumber: string;
}

export class ChangePhoneNumberRequestResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'OTP sent to new phone number',
  })
  message: string;

  @ApiProperty({
    description: 'Expiration time for the OTP',
    example: '2024-01-01T12:00:00Z',
  })
  expiresAt: string;
}

export class ChangePhoneNumberVerifyResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Phone number changed successfully',
  })
  message: string;
}
