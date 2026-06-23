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
  UploadSignedAgreementDto,
  RenewAgreementDto,
  TerminateAgreementDto,
  SearchPartnershipAgreementDto,
  AgreementStatus,
  AgreementLegalReviewStatus,
  AgreementApprovalStatus,
  AmendmentDto,
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
        draft_versions: (dto.draft_versions ?? []) as unknown as Prisma.InputJsonValue,
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

    // Only editable in DRAFT state (re-submit after legal rejection goes through submitForLegalReview)
    if (agreement.status !== AgreementStatus.DRAFT) {
      throw new BadRequestException(
        'Agreement can only be updated in DRAFT status. Submit for legal review or use the re-submit action.',
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
      if (!engagement)
        throw new NotFoundException('Partnership Engagement not found');
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
        ...(dto.draft_versions && {
          draft_versions: dto.draft_versions as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.amendments && {
          amendments: dto.amendments as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.partnership_engagement_id !== undefined && {
          partnership_engagement_id: dto.partnership_engagement_id,
        }),
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

    if (agreement.status !== AgreementStatus.DRAFT) {
      throw new BadRequestException(
        'Agreement must be in DRAFT status to submit for legal review',
      );
    }

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        status: AgreementStatus.UNDER_REVIEW,
        // Reset any previous review / approval cycle
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
  //  UNDER_REVIEW → UNDER_REVIEW (with legal_review_status = VERIFIED or REJECTED)
  //  If REJECTED: officer must fix and re-submit (move back to DRAFT for editing)

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

    if (
      dto.status === AgreementLegalReviewStatus.REJECTED &&
      !dto.note?.trim()
    ) {
      throw new BadRequestException(
        'A rejection note is required when rejecting a legal review',
      );
    }

    // If rejected, move back to DRAFT so the officer can edit and re-submit
    const nextStatus =
      dto.status === AgreementLegalReviewStatus.REJECTED
        ? AgreementStatus.DRAFT
        : AgreementStatus.UNDER_REVIEW;

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
  //  Only allowed when legal_review_status = VERIFIED (still UNDER_REVIEW status)
  //  APPROVED → no status change yet (officer must upload signed doc separately)
  //  REJECTED → DRAFT (officer edits and re-submits)

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

    if (agreement.status !== AgreementStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        'Agreement must be in UNDER_REVIEW status for director approval',
      );
    }

    if (agreement.legal_review_status !== AgreementLegalReviewStatus.VERIFIED) {
      throw new BadRequestException(
        'Agreement must be legally verified before director approval',
      );
    }

    if (
      dto.status === AgreementApprovalStatus.REJECTED &&
      !dto.note?.trim()
    ) {
      throw new BadRequestException(
        'A rejection note is required when rejecting an agreement',
      );
    }

    // If rejected → back to DRAFT; if approved → stays UNDER_REVIEW awaiting signature upload
    const nextStatus =
      dto.status === AgreementApprovalStatus.REJECTED
        ? AgreementStatus.DRAFT
        : AgreementStatus.UNDER_REVIEW;

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        approval_status: dto.status,
        approval_note: dto.note ?? null,
        approved_by_id: approverId,
        approved_at: new Date(),
        status: nextStatus,
        // Reset legal review when rejected so it goes through the full cycle again
        ...(dto.status === AgreementApprovalStatus.REJECTED && {
          legal_review_status: AgreementLegalReviewStatus.PENDING,
          legal_review_note: null,
          legal_reviewed_by_id: null,
          legal_reviewed_at: null,
        }),
      },
      include: defaultInclude,
    });
  }

  // ─── Sign ─────────────────────────────────────────────────────────────────
  //  UNDER_REVIEW (with approval_status=APPROVED) → SIGNED

  async sign(id: string, dto: UploadSignedAgreementDto, officerId: string) {
    const agreement = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
    });
    if (!agreement) {
      throw new NotFoundException('Partnership Agreement not found');
    }

    if (agreement.status !== AgreementStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        'Agreement must be in UNDER_REVIEW status (director approved) to upload the signed document',
      );
    }

    if (agreement.approval_status !== AgreementApprovalStatus.APPROVED) {
      throw new BadRequestException(
        'Agreement must be approved by the director before it can be signed',
      );
    }

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        signed_version: dto.signed_version,
        signing_date: new Date(dto.signing_date),
        status: AgreementStatus.SIGNED,
      },
      include: defaultInclude,
    });
  }

  // ─── Activate ─────────────────────────────────────────────────────────────
  //  SIGNED → ACTIVE

  async activate(id: string) {
    const agreement = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
    });
    if (!agreement) {
      throw new NotFoundException('Partnership Agreement not found');
    }

    if (agreement.status !== AgreementStatus.SIGNED) {
      throw new BadRequestException(
        'Agreement must be in SIGNED status to activate',
      );
    }

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        status: AgreementStatus.ACTIVE,
      },
      include: defaultInclude,
    });
  }

  // ─── Expire ───────────────────────────────────────────────────────────────
  //  ACTIVE → EXPIRED  (typically called by a scheduled job or manually)

  async expire(id: string) {
    const agreement = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
    });
    if (!agreement) {
      throw new NotFoundException('Partnership Agreement not found');
    }

    if (agreement.status !== AgreementStatus.ACTIVE) {
      throw new BadRequestException(
        'Agreement must be in ACTIVE status to mark as expired',
      );
    }

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: { status: AgreementStatus.EXPIRED },
      include: defaultInclude,
    });
  }

  // ─── Renew ────────────────────────────────────────────────────────────────
  //  ACTIVE | EXPIRED → RENEWED

  async renew(id: string, dto: RenewAgreementDto) {
    const agreement = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
    });
    if (!agreement) {
      throw new NotFoundException('Partnership Agreement not found');
    }

    if (
      agreement.status !== AgreementStatus.ACTIVE &&
      agreement.status !== AgreementStatus.EXPIRED
    ) {
      throw new BadRequestException(
        'Agreement must be ACTIVE or EXPIRED to be renewed',
      );
    }

    // Append a new amendment record if description/url provided
    const existingAmendments = Array.isArray(agreement.amendments)
      ? (agreement.amendments as unknown as AmendmentDto[])
      : [];

    const newAmendments: AmendmentDto[] =
      dto.description || dto.url
        ? [
            ...existingAmendments,
            {
              description: dto.description ?? 'Agreement renewed',
              url: dto.url ?? '',
              amended_at: new Date().toISOString(),
            },
          ]
        : existingAmendments;

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        end_date: new Date(dto.end_date),
        ...(dto.renewal_date && { renewal_date: new Date(dto.renewal_date) }),
        amendments: newAmendments as unknown as Prisma.InputJsonValue,
        status: AgreementStatus.RENEWED,
      },
      include: defaultInclude,
    });
  }

  // ─── Terminate ────────────────────────────────────────────────────────────
  //  ACTIVE | SIGNED | RENEWED → TERMINATED

  async terminate(id: string, dto: TerminateAgreementDto) {
    const agreement = await this.prisma.partnershipAgreement.findUnique({
      where: { id },
    });
    if (!agreement) {
      throw new NotFoundException('Partnership Agreement not found');
    }

    const terminatable: AgreementStatus[] = [
      AgreementStatus.SIGNED,
      AgreementStatus.ACTIVE,
      AgreementStatus.RENEWED,
    ];

    if (!terminatable.includes(agreement.status as AgreementStatus)) {
      throw new BadRequestException(
        `Agreement must be in one of [${terminatable.join(', ')}] to be terminated`,
      );
    }

    return this.prisma.partnershipAgreement.update({
      where: { id },
      data: {
        status: AgreementStatus.TERMINATED,
        ...(dto.termination_note && {
          approval_note: dto.termination_note,
        }),
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
