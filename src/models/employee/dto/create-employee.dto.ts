import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  Matches,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the employee',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'john.doe',
    description: 'Unique username for the employee',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    example: 'StrongP@ss123',
    description: 'Password for the employee account',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiProperty({
    example: '+251912345678',
    description: 'Phone number of the employee',
  })
  @IsNotEmpty()
  @IsString()
  phone_number: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the employee',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'Profile image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  profile_image?: string;

  @ApiProperty({
    example: 'uuid-of-role',
    description: 'Role ID where the employee will be assigned',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiProperty({
    example: 'uuid-of-group',
    description: 'Group ID where the employee will be assigned',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  group_id?: string;

  @ApiProperty({
    example: false,
    description: 'Whether the employee is a supervisor of the group',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_supervisor?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether the employee requires password change on first login',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  require_password_change?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether the employee account is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
