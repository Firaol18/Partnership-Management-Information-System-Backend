import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import {
  CreatePartnershipAgreementDto,
  UpdatePartnershipAgreementDto,
  LegalReviewPartnershipAgreementDto,
  ApprovePartnershipAgreementDto,
  SearchPartnershipAgreementDto,
  AgreementStatus,
  AgreementLegalReviewStatus,
  AgreementApprovalStatus,
} from './dto';
import { paginate } from '../../common/utils/paginater';
import { Prisma } from '@prisma/client';

const employeeSelect = {
  select: {
    id: true,
    name: true,
    username: true,
  },
};

const defaultInclude = {
  partner: true,
  eaii_responsible_division: true,
  partnership_engagement: {
    select: {
      id: true,
      engagement_code: true,
      status: true,
    },
  },
  legal_reviewed_by: employeeSelect,
  approved_by: employeeSelect,
  created_by: employeeSelect,
};

@Injectable()
export class PartnershipAgreementService {
  constructor(private readonly prisma: DatabaseService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreatePartnershipAgreementDto, creatorId: string) {
    // Verify partner exists
    const partner = await this.prisma.partner.findUnique({
      where: { id: dto.partner_id },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Verify division if provided
    if (dto.eaii_responsible_division_id) {
      const division = await this.prisma.group.findUnique({
        where: { id: dto.eaii_responsible_division_id },
      });
      if (!division) {
        throw new NotFoundException('EAII responsible division not found');
      }
    }

    // Verify engagement if provided
    if (dto.partnership_engagement_id) {
      const engagement = await this.prisma.partnershipEngagement.findUnique({
        where: { id: dto.partnership_engagement_id },
      });
      if (!engagement) {
        throw new NotFoundException('Partnership Engagement not found');
      }
    }

    // Generate unique agreement code: AGR-YYYY-XXXX
    const year = new Date().getFullYear();
    const count = await this.prisma.partnershipAgreement.count();
    const agreement_code = `AGR-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.partnershipAgreement.create({
      data: {
        agreement_code,
        title: dto.title,
        agreement_type: dto.agreement_type,
        partner_id: dto.partner_id,
        eaii_responsible_division_id: dto.eaii_responsible_division_id,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        renewal_date: dto.renewal_date ? new Date(dto.renewal_date) : undefined,
        signatories: (dto.signatories ?? []) as unknown as Prisma.InputJsonValue,
        signing_date: dto.signing_date ? new Date(dto.signing_date) : undefined,
        draft_versions: (dto.draft_versions ?? []) as unknown as Prisma.InputJsonValue,
        signed_version: dto.signed_version,
        amendments: (dto.amendments ?? []) as unknown as Prisma.InputJsonValue,
        partnership_engagement_id: dto.partnership_engagement_id,
        status: AgreementStatus.DRAFT,
        created_by_id: creatorId,
      },
      include: defaultInclude,
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdatePartnershipAgreementDto,
    editorId: string,
  ) {
    const agreement = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
    });
    if (!agreement) {
      throw new NotFoundException('Partnership Agreement not found');
    }

    // Only editable in DRAFT or REJECTED state
    if (
      agreement.status !== AgreementStatus.DRAFT &&
      agreement.status !== AgreementStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Agreement can only be updated in DRAFT or REJECTED status',
      );
    }

    if (dto.partner_id) {
      const partner = await this.prisma.partner.findUnique({
        where: { id: dto.partner_id },
      });
      if (!partner) throw new NotFoundException('Partner not found');
    }

    if (dto.eaii_responsible_division_id) {
      const division = await this.prisma.group.findUnique({
        where: { id: dto.eaii_responsible_division_id },
      });
      if (!division) throw new NotFoundException('Division not found');
    }

    if (dto.partnership_engagement_id) {
      const engagement = await this.prisma.partnershipEngagement.findUnique({
        where: { id: dto.partnership_engagement_id },
      });
      if (!engagement) throw new NotFoundException('Partnership Engagement not found');
    }

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.agreement_type && { agreement_type: dto.agreement_type }),
        ...(dto.partner_id && { partner_id: dto.partner_id }),
        ...(dto.eaii_responsible_division_id !== undefined && {
          eaii_responsible_division_id: dto.eaii_responsible_division_id,
        }),
        ...(dto.start_date && { start_date: new Date(dto.start_date) }),
        ...(dto.end_date && { end_date: new Date(dto.end_date) }),
        ...(dto.renewal_date && { renewal_date: new Date(dto.renewal_date) }),
        ...(dto.signatories && {
          signatories: dto.signatories as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.signing_date && { signing_date: new Date(dto.signing_date) }),
        ...(dto.draft_versions && {
          draft_versions: dto.draft_versions as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.signed_version !== undefined && {
          signed_version: dto.signed_version,
        }),
        ...(dto.amendments && {
          amendments: dto.amendments as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.partnership_engagement_id !== undefined && {
          partnership_engagement_id: dto.partnership_engagement_id,
        }),
        // If previously REJECTED and being updated, move back to DRAFT
        status: AgreementStatus.DRAFT,
      },
      include: defaultInclude,
    });
  }

  // ─── Submit for Legal Review ──────────────────────────────────────────────

  async submitForLegalReview(id: string, officerId: string) {
    const agreement = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
    });
    if (!agreement) {
      throw new NotFoundException('Partnership Agreement not found');
    }

    if (
      agreement.status !== AgreementStatus.DRAFT &&
      agreement.status !== AgreementStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Agreement must be in DRAFT or REJECTED status to submit for review',
      );
    }

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        status: AgreementStatus.UNDER_REVIEW,
        // Reset previous review/approval
        legal_review_status: AgreementLegalReviewStatus.PENDING,
        legal_review_note: null,
        legal_reviewed_by_id: null,
        legal_reviewed_at: null,
        approval_status: AgreementApprovalStatus.PENDING,
        approval_note: null,
        approved_by_id: null,
        approved_at: null,
      },
      include: defaultInclude,
    });
  }

  // ─── Legal Officer Review ─────────────────────────────────────────────────

  async legalReview(
    id: string,
    dto: LegalReviewPartnershipAgreementDto,
    reviewerId: string,
  ) {
    const agreement = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
    });
    if (!agreement) {
      throw new NotFoundException('Partnership Agreement not found');
    }

    if (agreement.status !== AgreementStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        'Agreement must be in UNDER_REVIEW status for legal review',
      );
    }

    const isVerified = dto.status === AgreementLegalReviewStatus.VERIFIED;
    const nextStatus = isVerified
      ? AgreementStatus.VERIFIED
      : AgreementStatus.REJECTED;

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        legal_review_status: dto.status,
        legal_review_note: dto.note ?? null,
        legal_reviewed_by_id: reviewerId,
        legal_reviewed_at: new Date(),
        status: nextStatus,
      },
      include: defaultInclude,
    });
  }

  // ─── Director Approval ────────────────────────────────────────────────────

  async approve(
    id: string,
    dto: ApprovePartnershipAgreementDto,
    approverId: string,
  ) {
    const agreement = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
    });
    if (!agreement) {
      throw new NotFoundException('Partnership Agreement not found');
    }

    if (agreement.status !== AgreementStatus.VERIFIED) {
      throw new BadRequestException(
        'Agreement must be in VERIFIED status for approval decision',
      );
    }

    const isApproved = dto.status === AgreementApprovalStatus.APPROVED;
    const nextStatus = isApproved
      ? AgreementStatus.APPROVED
      : AgreementStatus.REJECTED;

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        approval_status: dto.status,
        approval_note: dto.note ?? null,
        approved_by_id: approverId,
        approved_at: new Date(),
        status: nextStatus,
      },
      include: defaultInclude,
    });
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const record = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
      include: defaultInclude,
    });
    if (!record) {
      throw new NotFoundException('Partnership Agreement not found');
    }
    return record;
  }

  async findAll(query: SearchPartnershipAgreementDto) {
    const where: Prisma.PartnershipAgreementWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { agreement_code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.agreement_type) {
      where.agreement_type = query.agreement_type;
    }

    if (query.partner_id) {
      where.partner_id = query.partner_id;
    }

    if (query.eaii_responsible_division_id) {
      where.eaii_responsible_division_id = query.eaii_responsible_division_id;
    }

    if (query.partnership_engagement_id) {
      where.partnership_engagement_id = query.partnership_engagement_id;
    }

    return paginate(
      this.prisma.partnershipAgreement,
      {
        where,
        orderBy: { created_at: 'desc' },
        include: defaultInclude,
      },
      { page: query.page, perPage: query.limit },
    );
  }
}
