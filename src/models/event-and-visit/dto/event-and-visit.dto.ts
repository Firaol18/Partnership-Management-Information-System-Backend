import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
  ValidateIf,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PartnerRepresentativeDto {
  @ApiProperty({ example: 'John Doe', description: 'Name of the representative' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'UNDP', description: 'Organization of the representative' })
  @IsNotEmpty()
  @IsString()
  organization: string;
}

export class EaiiRepresentativeDto {
  @ApiProperty({ example: 'Abebe', description: 'Name of the representative' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Director', description: 'Position of the representative' })
  @IsNotEmpty()
  @IsString()
  position: string;
}

export enum EventType {
  OFFICIAL_VISIT = 'OFFICIAL_VISIT',
  CONFERENCE = 'CONFERENCE',
  MEETING = 'MEETING',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreateEventAndVisitDto {
  @ApiProperty({
    example: 'AI Research Collaboration Summit',
    description: 'Name of the event or visit',
  })
  @IsNotEmpty()
  @IsString()
  event_name: string;

  @ApiProperty({
    enum: EventType,
    example: EventType.OFFICIAL_VISIT,
    description: 'Type of event/visit (OFFICIAL_VISIT, CONFERENCE, MEETING)',
  })
  @IsNotEmpty()
  @IsEnum(EventType)
  event_type: EventType;

  @ApiProperty({
    example: '2026-06-25T09:00:00.000Z',
    description: 'Date and time of the event/visit',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({
    example: 'EAII Headquarters, Addis Ababa',
    description: 'Venue/location of the event/visit',
  })
  @IsNotEmpty()
  @IsString()
  venue: string;

  @ApiProperty({
    type: [PartnerRepresentativeDto],
    description: 'Representatives from the partner organization',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerRepresentativeDto)
  partner_representatives: PartnerRepresentativeDto[];

  @ApiProperty({
    type: [EaiiRepresentativeDto],
    description: 'Representatives from EAII',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EaiiRepresentativeDto)
  eaii_representatives: EaiiRepresentativeDto[];

  @ApiProperty({
    example: 'Agreed to initiate a joint research project on NLP in Amharic.',
    description: 'Summary of agreements reached during the event/visit',
    required: false,
  })
  @IsOptional()
  @IsString()
  agreements_reached?: string;

  @ApiProperty({
    example: '1. Sarah to draft research proposal.\n2. Bob to share dataset requirements.',
    description: 'Action points and next steps',
    required: false,
  })
  @IsOptional()
  @IsString()
  action_points?: string;
}

export class UpdateEventAndVisitDto {
  @ApiProperty({ example: 'AI Research Collaboration Summit', required: false })
  @IsOptional()
  @IsString()
  event_name?: string;

  @ApiProperty({ enum: EventType, example: EventType.OFFICIAL_VISIT, required: false })
  @IsOptional()
  @IsEnum(EventType)
  event_type?: EventType;

  @ApiProperty({ example: '2026-06-25T09:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ example: 'EAII Headquarters, Addis Ababa', required: false })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiProperty({ type: [PartnerRepresentativeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerRepresentativeDto)
  partner_representatives?: PartnerRepresentativeDto[];

  @ApiProperty({ type: [EaiiRepresentativeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EaiiRepresentativeDto)
  eaii_representatives?: EaiiRepresentativeDto[];

  @ApiProperty({ example: 'Agreements...', required: false })
  @IsOptional()
  @IsString()
  agreements_reached?: string;

  @ApiProperty({ example: 'Action points...', required: false })
  @IsOptional()
  @IsString()
  action_points?: string;
}

export class VerifyEventAndVisitDto {
  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.VERIFIED,
    description: 'Verification status (VERIFIED or REJECTED)',
  })
  @IsNotEmpty()
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @ApiProperty({
    example: 'Event metadata and outcomes match initial proposal.',
    description: 'Rejection reason (required when status is REJECTED) or approval remarks (optional)',
    required: false,
  })
  @ValidateIf((o) => o.status === VerificationStatus.REJECTED)
  @IsNotEmpty({ message: 'A rejection reason (note) is required when rejecting' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ApproveEventAndVisitDto {
  @ApiProperty({
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED,
    description: 'Approval status (APPROVED or REJECTED)',
  })
  @IsNotEmpty()
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @ApiProperty({
    example: 'Approved. Proceed to implementation.',
    description: 'Rejection reason (required when status is REJECTED) or approval remarks (optional)',
    required: false,
  })
  @ValidateIf((o) => o.status === ApprovalStatus.REJECTED)
  @IsNotEmpty({ message: 'A rejection reason (note) is required when rejecting' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignEmployeeDto {
  @ApiProperty({
    example: '464584db-5408-4d7b-94f8-d2a5aa1e3e67',
    description: 'UUID of the employee to assign to the event/visit',
  })
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

  @ApiProperty({ example: 'AI Summit', required: false, description: 'Search term for name or venue' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: EventType, required: false, description: 'Filter by event type' })
  @IsOptional()
  @IsEnum(EventType)
  event_type?: EventType;

  @ApiProperty({ enum: VerificationStatus, required: false, description: 'Filter by verification status' })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verification_status?: VerificationStatus;

  @ApiProperty({ enum: ApprovalStatus, required: false, description: 'Filter by approval status' })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  approval_status?: ApprovalStatus;
}
