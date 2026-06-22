import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IdType } from '@prisma/client';
import { Expose } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { PaginationDto } from '../../common/dtos/global.dto';

// Flow A: Normal signup DTOs
export class CreateUserDto {
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

  @ApiProperty({
    description:
      'ID type (must be one of the following: FAYDA_ID, GOVERNMENT_ID, TIN_NUMBER, PASSPORT)',
    example: 'FAYDA_ID',
  })
  @IsNotEmpty()
  @IsString()
  @IsEnum(IdType)
  id_type: string;
}

export class SearchUserDto extends PartialType(PaginationDto) {
  @ApiProperty()
  @IsOptional()
  search?: string;
}

export class UpdateUserDto {
  @Expose()
  @IsOptional()
  @ApiProperty()
  name: string;

  @Expose()
  @IsOptional()
  @ApiProperty()
  username: string;

  @Expose()
  @IsOptional()
  @ApiProperty()
  phone_number: string;

  @Expose()
  @IsOptional()
  @ApiProperty()
  email?: string;

  @Expose()
  @IsOptional()
  @ApiProperty()
  require_password_change: boolean;
}

export class UpdateMyProfileDto {
  @Expose()
  @IsOptional()
  @ApiProperty()
  name: string;

  @Expose()
  @IsOptional()
  @ApiProperty()
  phone_number: string;

  @Expose()
  @IsOptional()
  @ApiProperty()
  email?: string;
}
