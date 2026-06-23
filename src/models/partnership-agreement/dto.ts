import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dtos/global.dto';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum AgreementType {
  MOU = 'MOU',
  MOA = 'MOA',
  CONTRACT = 'CONTRACT',
  GRANT_AGREEMENT = 'GRANT_AGREEMENT',
  RESEARCH_AGREEMENT = 'RESEARCH_AGREEMENT',
  NDA = 'NDA',
  OTHER = 'OTHER',
}

export enum AgreementLegalReviewStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum AgreementApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum AgreementStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SIGNED = 'SIGNED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  RENEWED = 'RENEWED',
  TERMINATED = 'TERMINATED',
}

// ─── Nested Types ─────────────────────────────────────────────────────────────

export class SignatoryDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'CEO' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'UNDP' })
  @IsString()
  organization: string;
}

export class DraftVersionDto {
  @ApiProperty({ example: 'v1.0' })
  @IsString()
  version: string;

  @ApiProperty({ example: 'https://storage.example.com/doc.pdf' })
  @IsString()
  url: string;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  @IsDateString()
  uploaded_at: string;
}

export class AmendmentDto {
  @ApiProperty({ example: 'Extended duration by 6 months' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'https://storage.example.com/amendment.pdf' })
  @IsString()
  url: string;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  @IsDateString()
  amended_at: string;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreatePartnershipAgreementDto {
  @ApiProperty({ example: 'MOU with UNDP 2026' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: AgreementType })
  @IsEnum(AgreementType)
  agreement_type: AgreementType;

  @ApiProperty({ example: 'uuid-of-partner' })
  @IsUUID()
  partner_id: string;

  @ApiProperty({ example: 'uuid-of-division', required: false })
  @IsOptional()
  @IsUUID()
  eaii_responsible_division_id?: string;

  @ApiProperty({ example: '2026-01-01', required: false })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ example: '2027-01-01', required: false })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ example: '2026-12-01', required: false })
  @IsOptional()
  @IsDateString()
  renewal_date?: string;

  @ApiProperty({ type: [SignatoryDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignatoryDto)
  signatories?: SignatoryDto[];

  @ApiProperty({ example: '2026-06-15', required: false })
  @IsOptional()
  @IsDateString()
  signing_date?: string;

  @ApiProperty({ type: [DraftVersionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftVersionDto)
  draft_versions?: DraftVersionDto[];

  @ApiProperty({ example: 'https://storage.example.com/signed.pdf', required: false })
  @IsOptional()
  @IsString()
  signed_version?: string;

  @ApiProperty({ type: [AmendmentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmendmentDto)
  amendments?: AmendmentDto[];

  @ApiProperty({ example: 'uuid-of-engagement', required: false })
  @IsOptional()
  @IsUUID()
  partnership_engagement_id?: string;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export class UpdatePartnershipAgreementDto {
  @ApiProperty({ example: 'Updated MOU Title', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiProperty({ enum: AgreementType, required: false })
  @IsOptional()
  @IsEnum(AgreementType)
  agreement_type?: AgreementType;

  @ApiProperty({ example: 'uuid-of-partner', required: false })
  @IsOptional()
  @IsUUID()
  partner_id?: string;

  @ApiProperty({ example: 'uuid-of-division', required: false })
  @IsOptional()
  @IsUUID()
  eaii_responsible_division_id?: string;

  @ApiProperty({ example: '2026-01-01', required: false })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ example: '2027-01-01', required: false })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ example: '2026-12-01', required: false })
  @IsOptional()
  @IsDateString()
  renewal_date?: string;

  @ApiProperty({ type: [SignatoryDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignatoryDto)
  signatories?: SignatoryDto[];

  @ApiProperty({ example: '2026-06-15', required: false })
  @IsOptional()
  @IsDateString()
  signing_date?: string;

  @ApiProperty({ type: [DraftVersionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftVersionDto)
  draft_versions?: DraftVersionDto[];

  @ApiProperty({ example: 'https://storage.example.com/signed.pdf', required: false })
  @IsOptional()
  @IsString()
  signed_version?: string;

  @ApiProperty({ type: [AmendmentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmendmentDto)
  amendments?: AmendmentDto[];

  @ApiProperty({ example: 'uuid-of-engagement', required: false })
  @IsOptional()
  @IsUUID()
  partnership_engagement_id?: string;
}

// ─── Legal Review ─────────────────────────────────────────────────────────────

export class LegalReviewPartnershipAgreementDto {
  @ApiProperty({ enum: [AgreementLegalReviewStatus.VERIFIED, AgreementLegalReviewStatus.REJECTED] })
  @IsEnum(AgreementLegalReviewStatus)
  status: AgreementLegalReviewStatus;

  @ApiProperty({ example: 'All clauses look good', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

// ─── Approve ──────────────────────────────────────────────────────────────────

export class ApprovePartnershipAgreementDto {
  @ApiProperty({ enum: [AgreementApprovalStatus.APPROVED, AgreementApprovalStatus.REJECTED] })
  @IsEnum(AgreementApprovalStatus)
  status: AgreementApprovalStatus;

  @ApiProperty({ example: 'Approved for signing', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

export class UploadSignedAgreementDto {
  @ApiProperty({ example: 'https://storage.example.com/signed.pdf', description: 'URL of the final signed document' })
  @IsNotEmpty()
  @IsString()
  signed_version: string;

  @ApiProperty({ example: '2026-06-23', description: 'Date the agreement was signed' })
  @IsNotEmpty()
  @IsDateString()
  signing_date: string;
}

// ─── Renew ────────────────────────────────────────────────────────────────────

export class RenewAgreementDto {
  @ApiProperty({ example: '2027-06-23', description: 'New end date of the agreement' })
  @IsNotEmpty()
  @IsDateString()
  end_date: string;

  @ApiProperty({ example: '2027-05-23', required: false, description: 'New renewal notice/check date' })
  @IsOptional()
  @IsDateString()
  renewal_date?: string;

  @ApiProperty({ example: 'Agreement renewed for another year', required: false, description: 'Amendment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://storage.example.com/renewal_amendment.pdf', required: false, description: 'Amendment file URL' })
  @IsOptional()
  @IsString()
  url?: string;
}

// ─── Terminate ────────────────────────────────────────────────────────────────

export class TerminateAgreementDto {
  @ApiProperty({ example: 'Terminated due to project completion', required: false, description: 'Reason/note for termination' })
  @IsOptional()
  @IsString()
  termination_note?: string;
}

// ─── Search / Pagination ──────────────────────────────────────────────────────

export class SearchPartnershipAgreementDto extends PaginationDto {
  @ApiProperty({ example: 'UNDP', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: AgreementStatus, required: false })
  @IsOptional()
  @IsEnum(AgreementStatus)
  status?: AgreementStatus;

  @ApiProperty({ enum: AgreementType, required: false })
  @IsOptional()
  @IsEnum(AgreementType)
  agreement_type?: AgreementType;

  @ApiProperty({ example: 'uuid-of-partner', required: false })
  @IsOptional()
  @IsUUID()
  partner_id?: string;

  @ApiProperty({ example: 'uuid-of-division', required: false })
  @IsOptional()
  @IsUUID()
  eaii_responsible_division_id?: string;

  @ApiProperty({ example: 'uuid-of-engagement', required: false })
  @IsOptional()
  @IsUUID()
  partnership_engagement_id?: string;
}
