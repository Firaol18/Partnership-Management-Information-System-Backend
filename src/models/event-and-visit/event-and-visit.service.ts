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
    const year = new Date().getFullYear();
    const count = await this.prisma.eventAndVisit.count({
      where: {
        created_at: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
      },
    });
    const record_code = `EV-${year}-${String(count + 1).padStart(4, '0')}`;

    return await this.prisma.$transaction(async (tx) => {
      const record = await tx.eventAndVisit.create({
        data: {
          record_code,
          main_type: data.main_type,
          // Event fields
          event_name: data.event_name,
          event_type: data.event_type,
          event_category: data.event_category,
          event_date: data.event_date ? new Date(data.event_date) : null,
          start_time: data.start_time ? new Date(data.start_time) : null,
          end_time: data.end_time ? new Date(data.end_time) : null,
          venue: data.venue,
          organizer: data.organizer,
          co_organizer: data.co_organizer,
          event_mode: data.event_mode,
          // Visit fields
          visit_type: data.visit_type,
          visit_category: data.visit_category,
          visit_date: data.visit_date ? new Date(data.visit_date) : null,
          host_organization: data.host_organization,
          visiting_organization: data.visiting_organization,
          visit_location: data.visit_location,
          purpose_of_visit: data.purpose_of_visit,
          purpose_other: data.purpose_other,
          // Budget
          estimated_budget: data.estimated_budget,
          actual_budget: data.actual_budget,
          funding_source: data.funding_source,
          // Event outcomes
          key_discussions: data.key_discussions,
          agreements_reached: data.agreements_reached,
          action_points: data.action_points,
          objectives_achieved: data.objectives_achieved,
          recommendations: data.recommendations,
          // Visit outcomes
          key_topics_discussed: data.key_topics_discussed,
          opportunities_identified: data.opportunities_identified,
          follow_up_actions: data.follow_up_actions,
          // Focal person
          focal_person_name: data.focal_person_name,
          focal_person_division: data.focal_person_division,
          focal_person_email: data.focal_person_email,
          status: 'DRAFT',
          created_by_id: createdById,
        },
      });

      if (data.participants && data.participants.length > 0) {
        await tx.eventVisitParticipant.createMany({
          data: data.participants.map((p) => ({
            event_visit_id: record.id,
            role: p.role,
            full_name: p.full_name,
            organization_name: p.organization_name,
            division: p.division,
            position: p.position,
            email: p.email,
            phone_number: p.phone_number,
            participant_type: p.participant_type,
            country: p.country,
            status: p.status,
          })),
        });
      }

      if (data.documents && data.documents.length > 0) {
        await tx.eventVisitDocument.createMany({
          data: data.documents.map((d) => ({
            event_visit_id: record.id,
            attachment_type: d.attachment_type,
            file_name: d.file_name,
            file_url: d.file_url,
            uploaded_by_id: createdById,
          })),
        });
      }

      return await tx.eventAndVisit.findUnique({
        where: { id: record.id },
        include: {
          created_by: { select: { id: true, name: true, username: true } },
          participants: true,
          documents: true,
        },
      });
    });
  }

  async findAllPaginated(options: SearchEventAndVisitDto) {
    const { search, main_type, status } = options;
    const where: Prisma.EventAndVisitWhereInput = {};

    if (search) {
      where.OR = [
        { event_name: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
        { record_code: { contains: search, mode: 'insensitive' } },
        { host_organization: { contains: search, mode: 'insensitive' } },
        { visiting_organization: { contains: search, mode: 'insensitive' } },
        { focal_person_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (main_type) {
      where.main_type = main_type;
    }

    if (status) {
      where.status = status;
    }

    return await paginate(
      this.prisma.eventAndVisit,
      {
        where,
        orderBy: { created_at: 'desc' },
        include: {
          created_by: { select: { id: true, name: true, username: true } },
          assigned_to: { select: { id: true, name: true, username: true } },
          reviewed_by: { select: { id: true, name: true, username: true } },
          approved_by: { select: { id: true, name: true, username: true } },
          participants: true,
          documents: true,
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
        assigned_to: { select: { id: true, name: true, username: true } },
        reviewed_by: { select: { id: true, name: true, username: true } },
        approved_by: { select: { id: true, name: true, username: true } },
        participants: true,
        documents: {
          include: {
            uploaded_by: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Event or Visit record not found');
    }

    return record;
  }

  async update(id: string, data: UpdateEventAndVisitDto, currentEmployeeId: string) {
    const record = await this.findOne(id);

    if (record.status !== 'DRAFT' && record.status !== 'REJECTED') {
      throw new BadRequestException('Cannot modify an event or visit unless it is in DRAFT or REJECTED status');
    }

    if (record.created_by_id !== currentEmployeeId) {
      throw new ForbiddenException('Only the creator can modify this record');
    }

    const updateData: Prisma.EventAndVisitUpdateInput = {
      // Event fields
      event_name: data.event_name,
      event_type: data.event_type,
      event_category: data.event_category,
      event_date: data.event_date ? new Date(data.event_date) : undefined,
      start_time: data.start_time ? new Date(data.start_time) : undefined,
      end_time: data.end_time ? new Date(data.end_time) : undefined,
      venue: data.venue,
      organizer: data.organizer,
      co_organizer: data.co_organizer,
      event_mode: data.event_mode,
      // Visit fields
      visit_type: data.visit_type,
      visit_category: data.visit_category,
      visit_date: data.visit_date ? new Date(data.visit_date) : undefined,
      host_organization: data.host_organization,
      visiting_organization: data.visiting_organization,
      visit_location: data.visit_location,
      purpose_of_visit: data.purpose_of_visit,
      purpose_other: data.purpose_other,
      // Budget
      estimated_budget: data.estimated_budget,
      actual_budget: data.actual_budget,
      funding_source: data.funding_source,
      // Event outcomes
      key_discussions: data.key_discussions,
      agreements_reached: data.agreements_reached,
      action_points: data.action_points,
      objectives_achieved: data.objectives_achieved,
      recommendations: data.recommendations,
      // Visit outcomes
      key_topics_discussed: data.key_topics_discussed,
      opportunities_identified: data.opportunities_identified,
      follow_up_actions: data.follow_up_actions,
      // Focal person
      focal_person_name: data.focal_person_name,
      focal_person_division: data.focal_person_division,
      focal_person_email: data.focal_person_email,
    };

    return await this.prisma.$transaction(async (tx) => {
      // Update main record
      await tx.eventAndVisit.update({
        where: { id },
        data: updateData,
      });

      // Update participants if explicitly passed in update DTO
      if (data.participants !== undefined) {
        await tx.eventVisitParticipant.deleteMany({ where: { event_visit_id: id } });
        if (data.participants.length > 0) {
          await tx.eventVisitParticipant.createMany({
            data: data.participants.map((p) => ({
              event_visit_id: id,
              role: p.role,
              full_name: p.full_name,
              organization_name: p.organization_name,
              division: p.division,
              position: p.position,
              email: p.email,
              phone_number: p.phone_number,
              participant_type: p.participant_type,
              country: p.country,
              status: p.status,
            })),
          });
        }
      }

      // Update documents if explicitly passed in update DTO
      if (data.documents !== undefined) {
        await tx.eventVisitDocument.deleteMany({ where: { event_visit_id: id } });
        if (data.documents.length > 0) {
          await tx.eventVisitDocument.createMany({
            data: data.documents.map((d) => ({
              event_visit_id: id,
              attachment_type: d.attachment_type,
              file_name: d.file_name,
              file_url: d.file_url,
              uploaded_by_id: currentEmployeeId,
            })),
          });
        }
      }

      return await tx.eventAndVisit.findUnique({
        where: { id },
        include: {
          created_by: { select: { id: true, name: true, username: true } },
          participants: true,
          documents: true,
        },
      });
    });
  }

  async remove(id: string, currentEmployeeId: string) {
    const record = await this.findOne(id);

    if (record.status !== 'DRAFT' && record.status !== 'REJECTED') {
      throw new BadRequestException('Cannot delete an event or visit unless it is in DRAFT or REJECTED status');
    }

    if (record.created_by_id !== currentEmployeeId) {
      throw new ForbiddenException('Only the creator can delete this record');
    }

    await this.prisma.eventAndVisit.delete({
      where: { id },
    });

    return { message: 'Event or Visit deleted successfully' };
  }

  async submit(id: string, currentEmployeeId: string) {
    const record = await this.findOne(id);

    if (record.status !== 'DRAFT' && record.status !== 'REJECTED') {
      throw new BadRequestException('Can only submit draft or rejected records');
    }

    if (record.created_by_id !== currentEmployeeId) {
      throw new ForbiddenException('Only the creator can submit this record');
    }

    return await this.prisma.eventAndVisit.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        participants: true,
        documents: true,
      },
    });
  }

  async verify(id: string, data: VerifyEventAndVisitDto, reviewedById: string) {
    const record = await this.findOne(id);

    if (record.status !== 'SUBMITTED' && record.status !== 'ASSIGNED') {
      throw new BadRequestException('Can only review submitted or assigned records');
    }

    return await this.prisma.eventAndVisit.update({
      where: { id },
      data: {
        reviewed_by_id: reviewedById,
      },
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        reviewed_by: { select: { id: true, name: true, username: true } },
        participants: true,
        documents: true,
      },
    });
  }

  async approve(id: string, data: ApproveEventAndVisitDto, approvedById: string) {
    const record = await this.findOne(id);

    if (record.status !== 'SUBMITTED' && record.status !== 'ASSIGNED') {
      throw new BadRequestException('Can only approve or reject submitted or assigned records');
    }

    const updateData: any = {
      status: data.status,
    };

    if (data.status === 'APPROVED') {
      updateData.approved_by_id = approvedById;
      updateData.rejection_reason = null;
    } else {
      updateData.rejection_reason = data.rejection_reason || null;
      updateData.approved_by_id = null;
    }

    return await this.prisma.eventAndVisit.update({
      where: { id },
      data: updateData,
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        approved_by: { select: { id: true, name: true, username: true } },
        participants: true,
        documents: true,
      },
    });
  }

  async assign(id: string, data: AssignEmployeeDto) {
    const record = await this.findOne(id);

    if (record.status !== 'SUBMITTED' && record.status !== 'ASSIGNED') {
      throw new BadRequestException('Can only assign submitted or assigned records');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employee_id },
    });

    if (!employee) {
      throw new NotFoundException('Assigned employee not found');
    }

    return await this.prisma.eventAndVisit.update({
      where: { id },
      data: {
        assigned_to_id: data.employee_id,
        status: 'ASSIGNED',
      },
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        assigned_to: { select: { id: true, name: true, username: true } },
        participants: true,
        documents: true,
      },
    });
  }
}
