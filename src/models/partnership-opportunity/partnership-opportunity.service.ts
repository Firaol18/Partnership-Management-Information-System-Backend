import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import {
  CreatePartnershipOpportunityDto,
  UpdatePartnershipOpportunityDto,
  ScreenOpportunityDto,
  VerifyOpportunityDto,
  ForwardOpportunityDto,
  ReviewOpportunityDto,
  ApproveOpportunityDto,
  SearchPartnershipOpportunityDto,
  OppScreeningStatus,
  OppVerificationStatus,
} from './dto';
import { paginate } from '../../common/utils/paginater';
import { Prisma } from '@prisma/client';

const employeeSelect = { select: { id: true, name: true, username: true } };
const groupSelect = { select: { id: true, name: true } };

const defaultInclude = {
  created_by: employeeSelect,
  screened_by: employeeSelect,
  verified_by: employeeSelect,
  forwarded_by: employeeSelect,
  forwarded_to_division: groupSelect,
  reviewed_by: employeeSelect,
  approved_by: employeeSelect,
};

@Injectable()
export class PartnershipOpportunityService {
  constructor(private readonly prisma: DatabaseService) {}

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(data: CreatePartnershipOpportunityDto, createdById: string) {
    // Generate opportunity code: OPP-YYYY-XXXX
    const year = new Date().getFullYear();
    const count = await this.prisma.partnershipOpportunity.count();
    const opportunity_code = `OPP-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.partnershipOpportunity.create({
      data: {
        opportunity_code,
        title: data.title,
        date_identified: new Date(data.date_identified),
        source_of_opportunity: data.source_of_opportunity,
        description: data.description,
        strategic_alignment: data.strategic_alignment,
        expected_benefits: data.expected_benefits,
        created_by_id: createdById,
      },
      include: defaultInclude,
    });
  }

  // ─── Find all (paginated) ────────────────────────────────────────────────────

  async findAllPaginated(options: SearchPartnershipOpportunityDto) {
    const { search, source_of_opportunity, screening_status, verification_status, review_status, approval_status, division_id } = options;
    const where: Prisma.PartnershipOpportunityWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { opportunity_code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (source_of_opportunity) where.source_of_opportunity = source_of_opportunity;
    if (screening_status) where.screening_status = screening_status;
    if (verification_status) where.verification_status = verification_status;
    if (review_status) where.review_status = review_status;
    if (approval_status) where.approval_status = approval_status;
    if (division_id) where.forwarded_to_division_id = division_id;

    return paginate(
      this.prisma.partnershipOpportunity,
      { where, orderBy: { created_at: 'desc' }, include: defaultInclude },
      { page: options.page, perPage: options.limit },
    );
  }

  // ─── Find one ────────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const record = await this.prisma.partnershipOpportunity.findUnique({
      where: { id },
      include: defaultInclude,
    });
    if (!record) throw new NotFoundException('Partnership opportunity not found');
    return record;
  }

  // ─── Update (creator only, only before screening) ───────────────────────────

  async update(id: string, data: UpdatePartnershipOpportunityDto, currentEmployeeId: string) {
    const record = await this.findOne(id);

    if (record.screening_status !== 'PENDING') {
      throw new BadRequestException('Cannot modify an opportunity that has already been screened');
    }
    if (record.created_by_id !== currentEmployeeId) {
      throw new ForbiddenException('Only the creator can modify this opportunity');
    }

    const updateData: Prisma.PartnershipOpportunityUpdateInput = {
      title: data.title,
      description: data.description,
      source_of_opportunity: data.source_of_opportunity,
      strategic_alignment: data.strategic_alignment,
      expected_benefits: data.expected_benefits,
    };
    if (data.date_identified) updateData.date_identified = new Date(data.date_identified);

    return this.prisma.partnershipOpportunity.update({
      where: { id },
      data: updateData,
      include: defaultInclude,
    });
  }

  // ─── Delete (creator only, only before screening) ───────────────────────────

  async remove(id: string, currentEmployeeId: string) {
    const record = await this.findOne(id);

    if (record.screening_status !== 'PENDING') {
      throw new BadRequestException('Cannot delete an opportunity that has already been screened');
    }
    if (record.created_by_id !== currentEmployeeId) {
      throw new ForbiddenException('Only the creator can delete this opportunity');
    }

    await this.prisma.partnershipOpportunity.delete({ where: { id } });
    return { message: 'Partnership opportunity deleted successfully' };
  }

  // ─── Stage 1: Screen (K&E Director) ─────────────────────────────────────────

  async screen(id: string, data: ScreenOpportunityDto, screenedById: string) {
    await this.findOne(id);

    return this.prisma.partnershipOpportunity.update({
      where: { id },
      data: {
        screening_status: data.status,
        screening_note: data.note || null,
        screened_by_id: screenedById,
        screened_at: new Date(),
      },
      include: defaultInclude,
    });
  }

  // ─── Stage 2: Verify (K&E Director) ─────────────────────────────────────────

  async verify(id: string, data: VerifyOpportunityDto, verifiedById: string) {
    const record = await this.findOne(id);

    if (record.screening_status !== OppScreeningStatus.SCREENED && data.status === OppVerificationStatus.VERIFIED) {
      throw new BadRequestException('Cannot verify an opportunity that has not been screened yet');
    }

    return this.prisma.partnershipOpportunity.update({
      where: { id },
      data: {
        verification_status: data.status,
        verification_note: data.note || null,
        verified_by_id: verifiedById,
        verified_at: new Date(),
      },
      include: defaultInclude,
    });
  }

  // ─── Stage 3: Forward to Division (K&E Director) ────────────────────────────

  async forward(id: string, data: ForwardOpportunityDto, forwardedById: string) {
    const record = await this.findOne(id);

    if (record.verification_status !== OppVerificationStatus.VERIFIED) {
      throw new BadRequestException('Cannot forward an opportunity that has not been verified yet');
    }

    // Verify division exists
    const division = await this.prisma.group.findUnique({ where: { id: data.division_id } });
    if (!division) throw new NotFoundException('Division not found');

    return this.prisma.partnershipOpportunity.update({
      where: { id },
      data: {
        forwarded_to_division_id: data.division_id,
        forwarded_by_id: forwardedById,
        forwarded_at: new Date(),
      },
      include: defaultInclude,
    });
  }

  // ─── Stage 4: Review (Division Director) ────────────────────────────────────

  async review(id: string, data: ReviewOpportunityDto, reviewedById: string) {
    const record = await this.findOne(id);

    if (!record.forwarded_to_division_id) {
      throw new BadRequestException('Cannot review an opportunity that has not been forwarded to a division yet');
    }

    return this.prisma.partnershipOpportunity.update({
      where: { id },
      data: {
        review_status: data.status,
        review_note: data.note || null,
        reviewed_by_id: reviewedById,
        reviewed_at: new Date(),
      },
      include: defaultInclude,
    });
  }

  // ─── Stage 5: Approve (Division Director) ───────────────────────────────────

  async approve(id: string, data: ApproveOpportunityDto, approvedById: string) {
    const record = await this.findOne(id);

    if (record.review_status !== 'REVIEWED' && data.status === 'APPROVED') {
      throw new BadRequestException('Cannot approve an opportunity that has not been reviewed yet');
    }

    return this.prisma.partnershipOpportunity.update({
      where: { id },
      data: {
        approval_status: data.status,
        approval_note: data.note || null,
        approved_by_id: approvedById,
        approved_at: new Date(),
      },
      include: defaultInclude,
    });
  }
}
