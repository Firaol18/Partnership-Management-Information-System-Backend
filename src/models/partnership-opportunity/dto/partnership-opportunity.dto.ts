import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  ValidateIf,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum SourceOfOpportunity {
  PARTNER_PROPOSAL = 'PARTNER_PROPOSAL',
  MARKET_RESEARCH = 'MARKET_RESEARCH',
  GOVERNMENT_DIRECTIVE = 'GOVERNMENT_DIRECTIVE',
  STAKEHOLDER_REFERRAL = 'STAKEHOLDER_REFERRAL',
  INTERNAL_INITIATIVE = 'INTERNAL_INITIATIVE',
  INTERNATIONAL_COLLABORATION = 'INTERNATIONAL_COLLABORATION',
  OTHER = 'OTHER',
}

export enum StrategicAlignment {
  AI_RESEARCH = 'AI_RESEARCH',
  CAPACITY_BUILDING = 'CAPACITY_BUILDING',
  DIGITAL_TRANSFORMATION = 'DIGITAL_TRANSFORMATION',
  POLICY_DEVELOPMENT = 'POLICY_DEVELOPMENT',
  INNOVATION_ECOSYSTEM = 'INNOVATION_ECOSYSTEM',
  INTERNATIONAL_COOPERATION = 'INTERNATIONAL_COOPERATION',
  KNOWLEDGE_TRANSFER = 'KNOWLEDGE_TRANSFER',
  DATA_GOVERNANCE = 'DATA_GOVERNANCE',
  OTHER = 'OTHER',
}

export enum ExpectedBenefit {
  FUNDING = 'FUNDING',
  TECHNOLOGY_TRANSFER = 'TECHNOLOGY_TRANSFER',
  EXPERTISE_ACCESS = 'EXPERTISE_ACCESS',
  MARKET_ACCESS = 'MARKET_ACCESS',
  JOINT_RESEARCH = 'JOINT_RESEARCH',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  TRAINING = 'TRAINING',
  POLICY_INFLUENCE = 'POLICY_INFLUENCE',
  OTHER = 'OTHER',
}

export enum OppScreeningStatus {
  PENDING = 'PENDING',
  SCREENED = 'SCREENED',
  REJECTED = 'REJECTED',
}

export enum OppVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum OppReviewStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  REJECTED = 'REJECTED',
}

export enum OppApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreatePartnershipOpportunityDto {
  @ApiProperty({ example: 'NLP Research Collaboration with MIT', description: 'Title of the opportunity' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: '2026-06-20T00:00:00.000Z', description: 'Date the opportunity was identified' })
  @IsNotEmpty()
  @IsDateString()
  date_identified: string;

  @ApiProperty({
    enum: SourceOfOpportunity,
    example: SourceOfOpportunity.PARTNER_PROPOSAL,
    description: 'Single source/origin of the opportunity',
  })
  @IsNotEmpty()
  @IsEnum(SourceOfOpportunity)
  source_of_opportunity: SourceOfOpportunity;

  @ApiProperty({ example: 'A joint NLP research project focused on Amharic language models.', description: 'Full description of the opportunity' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    isArray: true,
    enum: StrategicAlignment,
    example: [StrategicAlignment.AI_RESEARCH, StrategicAlignment.KNOWLEDGE_TRANSFER],
    description: 'Multi-select: strategic areas this opportunity aligns with',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(StrategicAlignment, { each: true })
  strategic_alignment: StrategicAlignment[];

  @ApiProperty({
    isArray: true,
    enum: ExpectedBenefit,
    example: [ExpectedBenefit.JOINT_RESEARCH, ExpectedBenefit.EXPERTISE_ACCESS],
    description: 'Multi-select: expected benefits from this opportunity',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ExpectedBenefit, { each: true })
  expected_benefits: ExpectedBenefit[];
}

// ─── Update ───────────────────────────────────────────────────────────────────

export class UpdatePartnershipOpportunityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date_identified?: string;

  @ApiProperty({ enum: SourceOfOpportunity, required: false })
  @IsOptional()
  @IsEnum(SourceOfOpportunity)
  source_of_opportunity?: SourceOfOpportunity;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ isArray: true, enum: StrategicAlignment, required: false })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(StrategicAlignment, { each: true })
  strategic_alignment?: StrategicAlignment[];

  @ApiProperty({ isArray: true, enum: ExpectedBenefit, required: false })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ExpectedBenefit, { each: true })
  expected_benefits?: ExpectedBenefit[];
}

// ─── Screen (K&E Director — Stage 1) ─────────────────────────────────────────

export class ScreenOpportunityDto {
  @ApiProperty({
    enum: OppScreeningStatus,
    example: OppScreeningStatus.SCREENED,
    description: 'Screening result: SCREENED or REJECTED',
  })
  @IsNotEmpty()
  @IsEnum(OppScreeningStatus)
  status: OppScreeningStatus;

  @ApiProperty({ required: false, description: 'Required when status is REJECTED' })
  @ValidateIf((o) => o.status === OppScreeningStatus.REJECTED)
  @IsNotEmpty({ message: 'A rejection reason is required when rejecting' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ─── Verify (K&E Director — Stage 2) ─────────────────────────────────────────

export class VerifyOpportunityDto {
  @ApiProperty({
    enum: OppVerificationStatus,
    example: OppVerificationStatus.VERIFIED,
    description: 'Verification result: VERIFIED or REJECTED',
  })
  @IsNotEmpty()
  @IsEnum(OppVerificationStatus)
  status: OppVerificationStatus;

  @ApiProperty({ required: false, description: 'Required when status is REJECTED' })
  @ValidateIf((o) => o.status === OppVerificationStatus.REJECTED)
  @IsNotEmpty({ message: 'A rejection reason is required when rejecting' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ─── Forward to Division (K&E Director — Stage 3) ────────────────────────────

export class ForwardOpportunityDto {
  @ApiProperty({
    example: 'b3d7e9a1-0001-4abc-9abc-000000000001',
    description: 'UUID of the Group (division) to forward the opportunity to',
  })
  @IsNotEmpty()
  @IsUUID()
  division_id: string;
}

// ─── Review (Division Director — Stage 4) ────────────────────────────────────

export class ReviewOpportunityDto {
  @ApiProperty({
    enum: OppReviewStatus,
    example: OppReviewStatus.REVIEWED,
    description: 'Review result: REVIEWED or REJECTED',
  })
  @IsNotEmpty()
  @IsEnum(OppReviewStatus)
  status: OppReviewStatus;

  @ApiProperty({ required: false, description: 'Required when status is REJECTED' })
  @ValidateIf((o) => o.status === OppReviewStatus.REJECTED)
  @IsNotEmpty({ message: 'A rejection reason is required when rejecting' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ─── Approve (Division Director — Stage 5) ───────────────────────────────────

export class ApproveOpportunityDto {
  @ApiProperty({
    enum: OppApprovalStatus,
    example: OppApprovalStatus.APPROVED,
    description: 'Approval result: APPROVED (→ waiting list) or REJECTED',
  })
  @IsNotEmpty()
  @IsEnum(OppApprovalStatus)
  status: OppApprovalStatus;

  @ApiProperty({ required: false, description: 'Required when status is REJECTED' })
  @ValidateIf((o) => o.status === OppApprovalStatus.REJECTED)
  @IsNotEmpty({ message: 'A rejection reason is required when rejecting' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ─── Search / Paginate ────────────────────────────────────────────────────────

export class SearchPartnershipOpportunityDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Search by title or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: SourceOfOpportunity, required: false })
  @IsOptional()
  @IsEnum(SourceOfOpportunity)
  source_of_opportunity?: SourceOfOpportunity;

  @ApiProperty({ enum: OppScreeningStatus, required: false })
  @IsOptional()
  @IsEnum(OppScreeningStatus)
  screening_status?: OppScreeningStatus;

  @ApiProperty({ enum: OppVerificationStatus, required: false })
  @IsOptional()
  @IsEnum(OppVerificationStatus)
  verification_status?: OppVerificationStatus;

  @ApiProperty({ enum: OppReviewStatus, required: false })
  @IsOptional()
  @IsEnum(OppReviewStatus)
  review_status?: OppReviewStatus;

  @ApiProperty({ enum: OppApprovalStatus, required: false })
  @IsOptional()
  @IsEnum(OppApprovalStatus)
  approval_status?: OppApprovalStatus;

  @ApiProperty({ required: false, description: 'Filter by forwarded division UUID' })
  @IsOptional()
  @IsUUID()
  division_id?: string;
}
