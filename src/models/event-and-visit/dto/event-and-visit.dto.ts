import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MainType,
  EventType,
  EventCategory,
  EventMode,
  ParticipantType,
  VisitType,
  VisitCategory,
  VisitPurpose,
  WorkflowStatus,
  ParticipantRole,
  AttachmentType,
} from '@prisma/client';

export class EventVisitParticipantDto {
  @ApiProperty({ enum: ParticipantRole, example: 'PARTNER_PARTICIPANT' })
  @IsNotEmpty()
  @IsEnum(ParticipantRole)
  role: ParticipantRole;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @ApiProperty({ example: 'UNDP', required: false })
  @IsOptional()
  @IsString()
  organization_name?: string;

  @ApiProperty({ example: 'ICT Division', required: false })
  @IsOptional()
  @IsString()
  division?: string;

  @ApiProperty({ example: 'Project Manager', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ example: 'johndoe@example.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: '+251911000000', required: false })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ enum: ParticipantType, example: 'REPRESENTATIVE', required: false })
  @IsOptional()
  @IsEnum(ParticipantType)
  participant_type?: ParticipantType;

  @ApiProperty({ example: 'Ethiopia', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'Confirmed', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

export class EventVisitDocumentDto {
  @ApiProperty({ enum: AttachmentType, example: 'AGENDA' })
  @IsNotEmpty()
  @IsEnum(AttachmentType)
  attachment_type: AttachmentType;

  @ApiProperty({ example: 'agenda.pdf' })
  @IsNotEmpty()
  @IsString()
  file_name: string;

  @ApiProperty({ example: 'https://storage.example.com/agenda.pdf' })
  @IsNotEmpty()
  @IsString()
  file_url: string;
}

export class CreateEventAndVisitDto {
  @ApiProperty({ enum: MainType, example: 'EVENT' })
  @IsNotEmpty()
  @IsEnum(MainType)
  main_type: MainType;

  // =====================
  // EVENT FIELDS
  // =====================
  @ApiProperty({ example: 'AI Summit', required: false })
  @IsOptional()
  @IsString()
  event_name?: string;

  @ApiProperty({ enum: EventType, required: false })
  @IsOptional()
  @IsEnum(EventType)
  event_type?: EventType;

  @ApiProperty({ enum: EventCategory, required: false })
  @IsOptional()
  @IsEnum(EventCategory)
  event_category?: EventCategory;

  @ApiProperty({ example: '2026-06-25T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  event_date?: string;

  @ApiProperty({ example: '2026-06-25T09:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  start_time?: string;

  @ApiProperty({ example: '2026-06-25T17:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  end_time?: string;

  @ApiProperty({ example: 'EAII Headquarters', required: false })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiProperty({ example: 'EAII', required: false })
  @IsOptional()
  @IsString()
  organizer?: string;

  @ApiProperty({ example: 'Ministry of Tech', required: false })
  @IsOptional()
  @IsString()
  co_organizer?: string;

  @ApiProperty({ enum: EventMode, required: false })
  @IsOptional()
  @IsEnum(EventMode)
  event_mode?: EventMode;

  // =====================
  // VISIT FIELDS
  // =====================
  @ApiProperty({ enum: VisitType, required: false })
  @IsOptional()
  @IsEnum(VisitType)
  visit_type?: VisitType;

  @ApiProperty({ enum: VisitCategory, required: false })
  @IsOptional()
  @IsEnum(VisitCategory)
  visit_category?: VisitCategory;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  visit_date?: string;

  @ApiProperty({ example: 'EAII', required: false })
  @IsOptional()
  @IsString()
  host_organization?: string;

  @ApiProperty({ example: 'Delegation Co.', required: false })
  @IsOptional()
  @IsString()
  visiting_organization?: string;

  @ApiProperty({ example: 'Addis Ababa', required: false })
  @IsOptional()
  @IsString()
  visit_location?: string;

  @ApiProperty({ enum: VisitPurpose, required: false })
  @IsOptional()
  @IsEnum(VisitPurpose)
  purpose_of_visit?: VisitPurpose;

  @ApiProperty({ example: 'Special Discussion', required: false })
  @IsOptional()
  @IsString()
  purpose_other?: string;

  // =====================
  // BUDGET
  // =====================
  @ApiProperty({ example: 1000.00, required: false })
  @IsOptional()
  @Type(() => Number)
  estimated_budget?: number;

  @ApiProperty({ example: 950.00, required: false })
  @IsOptional()
  @Type(() => Number)
  actual_budget?: number;

  @ApiProperty({ example: 'Sponsor A', required: false })
  @IsOptional()
  @IsString()
  funding_source?: string;

  // =====================
  // EVENT OUTCOMES
  // =====================
  @ApiProperty({ example: 'Key discussions summary...', required: false })
  @IsOptional()
  @IsString()
  key_discussions?: string;

  @ApiProperty({ example: 'Agreements reached...', required: false })
  @IsOptional()
  @IsString()
  agreements_reached?: string;

  @ApiProperty({ example: 'Action points...', required: false })
  @IsOptional()
  @IsString()
  action_points?: string;

  @ApiProperty({ example: 'Objectives achieved...', required: false })
  @IsOptional()
  @IsString()
  objectives_achieved?: string;

  @ApiProperty({ example: 'Recommendations...', required: false })
  @IsOptional()
  @IsString()
  recommendations?: string;

  // =====================
  // VISIT OUTCOMES
  // =====================
  @ApiProperty({ example: 'Key topics discussed...', required: false })
  @IsOptional()
  @IsString()
  key_topics_discussed?: string;

  @ApiProperty({ example: 'Opportunities identified...', required: false })
  @IsOptional()
  @IsString()
  opportunities_identified?: string;

  @ApiProperty({ example: 'Follow up actions...', required: false })
  @IsOptional()
  @IsString()
  follow_up_actions?: string;

  // =====================
  // FOCAL PERSON
  // =====================
  @ApiProperty({ example: 'Focal Person Name', required: false })
  @IsOptional()
  @IsString()
  focal_person_name?: string;

  @ApiProperty({ example: 'Focal Division', required: false })
  @IsOptional()
  @IsString()
  focal_person_division?: string;

  @ApiProperty({ example: 'focal@example.com', required: false })
  @IsOptional()
  @IsString()
  focal_person_email?: string;

  // =====================
  // RELATION DATA
  // =====================
  @ApiProperty({ type: [EventVisitParticipantDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventVisitParticipantDto)
  participants?: EventVisitParticipantDto[];

  @ApiProperty({ type: [EventVisitDocumentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventVisitDocumentDto)
  documents?: EventVisitDocumentDto[];
}

export class UpdateEventAndVisitDto extends PartialType(CreateEventAndVisitDto) {}

export class VerifyEventAndVisitDto {
  @ApiProperty({ example: 'Reviewed successfully', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ApproveEventAndVisitDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' })
  @IsNotEmpty()
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiProperty({ example: 'Budget exceeds threshold', required: false })
  @IsOptional()
  @IsString()
  rejection_reason?: string;
}

export class AssignEmployeeDto {
  @ApiProperty({ example: '464584db-5408-4d7b-94f8-d2a5aa1e3e67' })
  @IsNotEmpty()
  @IsUUID()
  employee_id: string;
}

export class SearchEventAndVisitDto {
  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 10, required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ example: 'AI Summit', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: MainType, required: false })
  @IsOptional()
  @IsEnum(MainType)
  main_type?: MainType;

  @ApiProperty({ enum: WorkflowStatus, required: false })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;
}
