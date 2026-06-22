import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import {
  CreateEventAndVisitDto,
  UpdateEventAndVisitDto,
  VerifyEventAndVisitDto,
  ApproveEventAndVisitDto,
  AssignEmployeeDto,
  SearchEventAndVisitDto,
} from './dto';
import { paginate } from '../../common/utils/paginater';
import { Prisma } from '@prisma/client';

@Injectable()
export class EventAndVisitService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(data: CreateEventAndVisitDto, createdById: string) {
    return await this.prisma.eventAndVisit.create({
      data: {
        event_name: data.event_name,
        event_type: data.event_type,
        date: new Date(data.date),
        venue: data.venue,
        partner_representatives: data.partner_representatives,
        eaii_representatives: data.eaii_representatives,
        agreements_reached: data.agreements_reached || null,
        action_points: data.action_points || null,
        created_by_id: createdById,
      },
      include: {
        created_by: {
          select: { id: true, name: true, username: true },
        },
      },
    });
  }

  async findAllPaginated(options: SearchEventAndVisitDto) {
    const { search, event_type, verification_status, approval_status } = options;
    const where: Prisma.EventAndVisitWhereInput = {};

    if (search) {
      where.OR = [
        { event_name: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (event_type) {
      where.event_type = event_type;
    }

    if (verification_status) {
      where.verification_status = verification_status;
    }

    if (approval_status) {
      where.approval_status = approval_status;
    }

    return await paginate(
      this.prisma.eventAndVisit,
      {
        where,
        orderBy: { created_at: 'desc' },
        include: {
          created_by: { select: { id: true, name: true, username: true } },
          verified_by: { select: { id: true, name: true, username: true } },
          approved_by: { select: { id: true, name: true, username: true } },
          assigned_employee: { select: { id: true, name: true, username: true } },
        },
      },
      { page: options.page, perPage: options.limit },
    );
  }

  async findOne(id: string) {
    const record = await this.prisma.eventAndVisit.findUnique({
      where: { id },
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        verified_by: { select: { id: true, name: true, username: true } },
        approved_by: { select: { id: true, name: true, username: true } },
        assigned_employee: { select: { id: true, name: true, username: true } },
      },
    });

    if (!record) {
      throw new NotFoundException('Event or Visit record not found');
    }

    return record;
  }

  async update(id: string, data: UpdateEventAndVisitDto, currentEmployeeId: string) {
    const record = await this.findOne(id);

    // Prevent modification if already verified or approved
    if (record.verification_status === 'VERIFIED') {
      throw new BadRequestException('Cannot modify a verified event or visit');
    }

    if (record.approval_status === 'APPROVED') {
      throw new BadRequestException('Cannot modify an approved event or visit');
    }

    // Only creator should modify, unless they are a supervisor/admin
    if (record.created_by_id !== currentEmployeeId) {
      throw new ForbiddenException('Only the creator can modify this record');
    }

    const updateData: Prisma.EventAndVisitUpdateInput = {
      event_name: data.event_name,
      event_type: data.event_type,
      venue: data.venue,
      partner_representatives: data.partner_representatives,
      eaii_representatives: data.eaii_representatives,
      agreements_reached: data.agreements_reached,
      action_points: data.action_points,
    };

    if (data.date) {
      updateData.date = new Date(data.date);
    }

    return await this.prisma.eventAndVisit.update({
      where: { id },
      data: updateData,
      include: {
        created_by: { select: { id: true, name: true, username: true } },
      },
    });
  }

  async remove(id: string, currentEmployeeId: string) {
    const record = await this.findOne(id);

    if (record.verification_status === 'VERIFIED') {
      throw new BadRequestException('Cannot delete a verified event or visit');
    }

    if (record.approval_status === 'APPROVED') {
      throw new BadRequestException('Cannot delete an approved event or visit');
    }

    if (record.created_by_id !== currentEmployeeId) {
      throw new ForbiddenException('Only the creator can delete this record');
    }

    await this.prisma.eventAndVisit.delete({
      where: { id },
    });

    return { message: 'Event or Visit deleted successfully' };
  }

  async verify(id: string, data: VerifyEventAndVisitDto, verifiedById: string) {
    await this.findOne(id);

    return await this.prisma.eventAndVisit.update({
      where: { id },
      data: {
        verification_status: data.status,
        verification_note: data.note || null,
        verified_by_id: verifiedById,
        verified_at: new Date(),
      },
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        verified_by: { select: { id: true, name: true, username: true } },
      },
    });
  }

  async approve(id: string, data: ApproveEventAndVisitDto, approvedById: string) {
    const record = await this.findOne(id);

    if (record.verification_status !== 'VERIFIED' && data.status === 'APPROVED') {
      throw new BadRequestException('Cannot approve an event that has not been verified yet');
    }

    return await this.prisma.eventAndVisit.update({
      where: { id },
      data: {
        approval_status: data.status,
        approval_note: data.note || null,
        approved_by_id: approvedById,
        approved_at: new Date(),
      },
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        verified_by: { select: { id: true, name: true, username: true } },
        approved_by: { select: { id: true, name: true, username: true } },
      },
    });
  }

  async assign(id: string, data: AssignEmployeeDto) {
    await this.findOne(id);

    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employee_id },
    });

    if (!employee) {
      throw new NotFoundException('Assigned employee not found');
    }

    return await this.prisma.eventAndVisit.update({
      where: { id },
      data: {
        assigned_employee_id: data.employee_id,
      },
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        assigned_employee: { select: { id: true, name: true, username: true } },
      },
    });
  }
}
