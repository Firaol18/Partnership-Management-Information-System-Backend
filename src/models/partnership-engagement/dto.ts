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
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum EngagementSource {
  OPPORTUNITY = 'OPPORTUNITY',
  DIRECT = 'DIRECT',
}

export enum EngagementType {
  CONFERENCE = 'CONFERENCE',
  MEETING = 'MEETING',
  EMAIL_INQUIRY = 'EMAIL_INQUIRY',
  WORKSHOP = 'WORKSHOP',
  VISIT = 'VISIT',
  CALL = 'CALL',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER',
}

export enum AttachmentType {
  MEETING_MINUTE = 'MEETING_MINUTE',
  PRESENTATION = 'PRESENTATION',
  STATUS_PHOTOS = 'STATUS_PHOTOS',
  MEETING_VIDEOS = 'MEETING_VIDEOS',
  OTHER = 'OTHER',
}

export enum EngagementStatus {
  ASSIGNED = 'ASSIGNED',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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

// ─── Shared Nested DTOs ────────────────────────────────────────────────────────

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

export class EngagementAttachmentDto {
  @ApiProperty({ enum: AttachmentType, example: AttachmentType.MEETING_MINUTE })
  @IsNotEmpty()
  @IsEnum(AttachmentType)
  type: AttachmentType;

  @ApiProperty({ example: 'https://example.com/files/minute.pdf' })
  @IsNotEmpty()
  @IsString()
  url: string;
}

// ─── Creation DTOs ────────────────────────────────────────────────────────────

export class CreateEngagementFromOpportunityDto {
  @ApiProperty({ example: '464584db-5408-4d7b-94f8-d2a5aa1e3e67', description: 'Opportunity UUID' })
  @IsNotEmpty()
  @IsUUID()
  partnership_opportunity_id: string;

  @ApiProperty({ example: '12345678-1234-1234-1234-123456789012', description: 'Partner UUID' })
  @IsNotEmpty()
  @IsUUID()
  partner_id: string;

  @ApiProperty({ example: '87654321-4321-4321-4321-210987654321', description: 'Officer UUID' })
  @IsNotEmpty()
  @IsUUID()
  assigned_officer_id: string;
}

export class CreateDirectEngagementDto {
  @ApiProperty({ example: '12345678-1234-1234-1234-123456789012', description: 'Partner UUID' })
  @IsNotEmpty()
  @IsUUID()
  partner_id: string;

  @ApiProperty({ example: '87654321-4321-4321-4321-210987654321', description: 'Officer UUID' })
  @IsNotEmpty()
  @IsUUID()
  assigned_officer_id: string;
}

// ─── Submission DTO ───────────────────────────────────────────────────────────

export class SubmitPartnershipEngagementDto {
  @ApiProperty({ example: '2026-06-25T09:00:00.000Z', description: 'Date of engagement' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ enum: EngagementType, example: EngagementType.MEETING })
  @IsNotEmpty()
  @IsEnum(EngagementType)
  engagement_type: EngagementType;

  @ApiProperty({ type: [PartnerRepresentativeDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerRepresentativeDto)
  partner_representatives: PartnerRepresentativeDto[];

  @ApiProperty({ type: [EaiiRepresentativeDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EaiiRepresentativeDto)
  eaii_representatives: EaiiRepresentativeDto[];

  @ApiProperty({ example: 'Summary of the discussion...', description: 'Key points discussed' })
  @IsNotEmpty()
  @IsString()
  key_points: string;

  @ApiProperty({ example: 'Agreed on NLP dataset collaboration...', description: 'Agreed action items' })
  @IsNotEmpty()
  @IsString()
  agreed_action: string;

  @ApiProperty({ example: 'Draft partnership MOU by next Friday.', description: 'Next steps' })
  @IsNotEmpty()
  @IsString()
  next_steps: string;

  @ApiProperty({ type: [EngagementAttachmentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EngagementAttachmentDto)
  attachments?: EngagementAttachmentDto[];
}

// ─── Review/Approval DTOs ──────────────────────────────────────────────────────

export class ReviewPartnershipEngagementDto {
  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.VERIFIED })
  @IsNotEmpty()
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @ApiProperty({ example: 'Verified deliverables.', required: false })
  @ValidateIf((o) => o.status === VerificationStatus.REJECTED)
  @IsNotEmpty({ message: 'A rejection reason is required when rejecting' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ApprovePartnershipEngagementDto {
  @ApiProperty({ enum: ApprovalStatus, example: ApprovalStatus.APPROVED })
  @IsNotEmpty()
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @ApiProperty({ example: 'Approved, proceed.', required: false })
  @ValidateIf((o) => o.status === ApprovalStatus.REJECTED)
  @IsNotEmpty({ message: 'A rejection reason is required when rejecting' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ─── Search DTO ───────────────────────────────────────────────────────────────

export class SearchPartnershipEngagementDto {
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

  @ApiProperty({ example: 'ENG-2026', required: false, description: 'Search term for engagement code, key points, next steps' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: EngagementStatus, required: false })
  @IsOptional()
  @IsEnum(EngagementStatus)
  status?: EngagementStatus;

  @ApiProperty({ enum: EngagementSource, required: false })
  @IsOptional()
  @IsEnum(EngagementSource)
  source?: EngagementSource;

  @ApiProperty({ example: 'uuid-of-partner', required: false })
  @IsOptional()
  @IsUUID()
  partner_id?: string;
}
