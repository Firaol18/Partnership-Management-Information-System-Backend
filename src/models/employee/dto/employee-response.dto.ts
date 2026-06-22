import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class EmployeeResponseDto {
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
  phone_number: string;

  @Expose()
  @ApiProperty()
  email?: string;

  @Expose()
  @ApiProperty()
  profile_image?: string;

  @Expose()
  @ApiProperty()
  require_password_change: boolean;

  @Expose()
  @ApiProperty()
  username_verified: boolean;

  @Expose()
  @ApiProperty()
  username_verified_at?: Date;

  @Expose()
  @ApiProperty()
  is_active: boolean;

  @Expose()
  @ApiProperty()
  active_status_updated_at?: Date;

  @Expose()
  @ApiProperty()
  status_update_note?: string;

  @Expose()
  @ApiProperty()
  is_suspended: boolean;

  @Expose()
  @ApiProperty()
  suspended_status_updated_at?: Date;

  @Expose()
  @ApiProperty()
  suspended_status_update_note?: string;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiProperty()
  updated_at: Date;

  @Expose()
  @ApiProperty()
  created_by_id?: string;

  @Expose()
  @ApiProperty()
  updated_by_id?: string;

  @Expose()
  @ApiProperty()
  employeeRoles?: any[];

  // Explicitly exclude sensitive fields
  @Exclude()
  password: string;

  @Exclude()
  code_hash: string;

  @Exclude()
  code_expiration: Date;

  @Expose()
  @ApiProperty()
  stats?: any;
}
