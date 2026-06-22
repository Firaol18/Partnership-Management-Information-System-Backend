import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PublicEmployeeProfileDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  profile_image?: string;
}
