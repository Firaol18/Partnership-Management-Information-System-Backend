import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import {
  CreateEngagementFromOpportunityDto,
  CreateDirectEngagementDto,
  SubmitPartnershipEngagementDto,
  ReviewPartnershipEngagementDto,
  ApprovePartnershipEngagementDto,
  SearchPartnershipEngagementDto,
  EngagementSource,
  EngagementStatus,
  VerificationStatus,
  ApprovalStatus,
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
  partnership_opportunity: true,
  assigned_officer: employeeSelect,
  assigned_by: employeeSelect,
  reviewed_by: employeeSelect,
  approved_by: employeeSelect,
  created_by: employeeSelect,
};

@Injectable()
export class PartnershipEngagementService {
  constructor(private readonly prisma: DatabaseService) {}

  // ─── Creation ───────────────────────────────────────────────────────────────

  async createFromOpportunity(
    dto: CreateEngagementFromOpportunityDto,
    creatorId: string,
  ) {
    // 1. Verify opportunity exists and is approved (waiting list)
    const opportunity = await this.prisma.partnershipOpportunity.findUnique({
      where: { id: dto.partnership_opportunity_id },
    });
    if (!opportunity) {
      throw new NotFoundException('Partnership Opportunity not found');
    }
    if (opportunity.approval_status !== 'APPROVED') {
      throw new BadRequestException('Opportunity is not on the waiting list');
    }

    // 2. Verify partner exists
    const partner = await this.prisma.partner.findUnique({
      where: { id: dto.partner_id },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // 3. Verify assigned officer exists
    const officer = await this.prisma.employee.findUnique({
      where: { id: dto.assigned_officer_id },
    });
    if (!officer) {
      throw new NotFoundException('Assigned employee not found');
    }

    // 4. Generate unique engagement code: ENG-YYYY-XXXX
    const year = new Date().getFullYear();
    const count = await this.prisma.partnershipEngagement.count();
    const engagement_code = `ENG-${year}-${String(count + 1).padStart(4, '0')}`;

    // 5. Create engagement
    return await this.prisma.partnershipEngagement.create({
      data: {
        engagement_code,
        source: EngagementSource.OPPORTUNITY,
        partner_id: dto.partner_id,
        partnership_opportunity_id: dto.partnership_opportunity_id,
        assigned_officer_id: dto.assigned_officer_id,
        assigned_by_id: creatorId,
        assigned_at: new Date(),
        status: EngagementStatus.ASSIGNED,
        created_by_id: creatorId,
      },
      include: defaultInclude,
    });
  }

  async createDirect(dto: CreateDirectEngagementDto, creatorId: string) {
    // 1. Verify partner exists
    const partner = await this.prisma.partner.findUnique({
      where: { id: dto.partner_id },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // 2. Verify assigned officer exists
    const officer = await this.prisma.employee.findUnique({
      where: { id: dto.assigned_officer_id },
    });
    if (!officer) {
      throw new NotFoundException('Assigned employee not found');
    }

    // 3. Generate unique engagement code: ENG-YYYY-XXXX
    const year = new Date().getFullYear();
    const count = await this.prisma.partnershipEngagement.count();
    const engagement_code = `ENG-${year}-${String(count + 1).padStart(4, '0')}`;

    // 4. Create engagement
    return await this.prisma.partnershipEngagement.create({
      data: {
        engagement_code,
        source: EngagementSource.DIRECT,
        partner_id: dto.partner_id,
        assigned_officer_id: dto.assigned_officer_id,
        assigned_by_id: creatorId,
        assigned_at: new Date(),
        status: EngagementStatus.ASSIGNED,
        created_by_id: creatorId,
      },
      include: defaultInclude,
    });
  }

  // ─── Officer Submission ──────────────────────────────────────────────────────

  async submit(id: string, dto: SubmitPartnershipEngagementDto, officerId: string) {
    const engagement = await this.prisma.partnershipEngagement.findUnique({
      where: { id },
    });
    if (!engagement) {
      throw new NotFoundException('Partnership Engagement not found');
    }

    // Only allow submission if currently ASSIGNED or REJECTED
    if (
      engagement.status !== EngagementStatus.ASSIGNED &&
      engagement.status !== EngagementStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Engagement cannot be submitted in its current status',
      );
    }

    // Enforce that only the assigned officer can submit details
    if (engagement.assigned_officer_id !== officerId) {
      throw new ForbiddenException(
        'Only the assigned officer can submit this engagement',
      );
    }

    return await this.prisma.partnershipEngagement.update({
      where: { id },
      data: {
        date: new Date(dto.date),
        engagement_type: dto.engagement_type,
        partner_representatives: dto.partner_representatives as unknown as Prisma.InputJsonValue,
        eaii_representatives: dto.eaii_representatives as unknown as Prisma.InputJsonValue,
        key_points: dto.key_points,
        agreed_action: dto.agreed_action,
        next_steps: dto.next_steps,
        attachments: (dto.attachments || []) as unknown as Prisma.InputJsonValue,
        status: EngagementStatus.SUBMITTED,
        // Reset verification and approval when submitting/resubmitting
        review_status: VerificationStatus.PENDING,
        review_note: null,
        reviewed_by_id: null,
        reviewed_at: null,
        approval_status: ApprovalStatus.PENDING,
        approval_note: null,
        approved_by_id: null,
        approved_at: null,
      },
      include: defaultInclude,
    });
  }

  // ─── Verification & Review (Stage 1) ─────────────────────────────────────────

  async review(id: string, dto: ReviewPartnershipEngagementDto, reviewerId: string) {
    const engagement = await this.prisma.partnershipEngagement.findUnique({
      where: { id },
    });
    if (!engagement) {
      throw new NotFoundException('Partnership Engagement not found');
    }

    if (engagement.status !== EngagementStatus.SUBMITTED) {
      throw new BadRequestException(
        'Engagement must be submitted before review',
      );
    }

    const isVerified = dto.status === VerificationStatus.VERIFIED;
    const nextStatus = isVerified
      ? EngagementStatus.VERIFIED
      : EngagementStatus.REJECTED;

    return await this.prisma.partnershipEngagement.update({
      where: { id },
      data: {
        review_status: dto.status,
        review_note: dto.note || null,
        reviewed_by_id: reviewerId,
        reviewed_at: new Date(),
        status: nextStatus,
      },
      include: defaultInclude,
    });
  }

  // ─── Approval (Stage 2) ─────────────────────────────────────────────────────

  async approve(id: string, dto: ApprovePartnershipEngagementDto, approverId: string) {
    const engagement = await this.prisma.partnershipEngagement.findUnique({
      where: { id },
    });
    if (!engagement) {
      throw new NotFoundException('Partnership Engagement not found');
    }

    if (engagement.status !== EngagementStatus.VERIFIED) {
      throw new BadRequestException(
        'Engagement must be verified before approval decision',
      );
    }

    const isApproved = dto.status === ApprovalStatus.APPROVED;
    const nextStatus = isApproved
      ? EngagementStatus.APPROVED
      : EngagementStatus.REJECTED;

    return await this.prisma.partnershipEngagement.update({
      where: { id },
      data: {
        approval_status: dto.status,
        approval_note: dto.note || null,
        approved_by_id: approverId,
        approved_at: new Date(),
        status: nextStatus,
      },
      include: defaultInclude,
    });
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const record = await this.prisma.partnershipEngagement.findUnique({
      where: { id },
      include: defaultInclude,
    });
    if (!record) {
      throw new NotFoundException('Partnership Engagement not found');
    }
    return record;
  }

  async findAll(query: SearchPartnershipEngagementDto) {
    const where: Prisma.PartnershipEngagementWhereInput = {};

    if (query.search) {
      where.OR = [
        { engagement_code: { contains: query.search, mode: 'insensitive' } },
        { key_points: { contains: query.search, mode: 'insensitive' } },
        { next_steps: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.partner_id) {
      where.partner_id = query.partner_id;
    }

    return await paginate(
      this.prisma.partnershipEngagement,
      {
        where,
        orderBy: { created_at: 'desc' },
        include: defaultInclude,
      },
      { page: query.page, perPage: query.limit },
    );
  }
}
