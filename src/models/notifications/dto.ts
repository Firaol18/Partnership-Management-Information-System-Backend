import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiPropertyOptional({
    description: 'User ID to whom the notification is sent',
    example: 'b1a2c3d4-e5f6-7890-abcd-1234567890ef',
  })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Employee ID to whom the notification is sent',
    example: 'e1f2a3b4-c5d6-7890-abcd-1234567890ef',
  })
  @IsOptional()
  @IsString()
  employee_id?: string;

  @ApiProperty({
    description: 'Type of the notification',
    example: 'application_status',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Payload of the notification',
    example: {
      title: 'Application Approved',
      body: 'Your application has been approved.',
      link: '/applications/123',
      priority: 'high',
      data: { applicationId: '123', status: 'approved' },
    },
    type: Object,
  })
  @IsObject()
  payload: {
    title: string;
    body: string;
    link?: string;
    priority?: 'low' | 'normal' | 'high';
    data?: Record<string, any>;
  };

  @ApiPropertyOptional({
    description: 'Status of the notification',
    example: 'unread',
    default: 'unread',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Expiration date of the notification',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsString()
  expires_at?: string;
}
