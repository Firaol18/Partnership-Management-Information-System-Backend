import { Test, TestingModule } from '@nestjs/testing';
import { EventAndVisitService } from './event-and-visit.service';
import { DatabaseService } from '../../common/database/database.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  MainType,
  EventType,
  EventCategory,
  EventMode,
  ParticipantRole,
  AttachmentType,
  WorkflowStatus,
} from '@prisma/client';

describe('EventAndVisitService', () => {
  let service: EventAndVisitService;
  let prisma: any;

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    eventAndVisit: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    eventVisitParticipant: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    eventVisitDocument: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventAndVisitService,
        { provide: DatabaseService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventAndVisitService>(EventAndVisitService);
    prisma = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an event record and return it', async () => {
      const createDto = {
        main_type: MainType.EVENT,
        event_name: 'AI Summit',
        event_type: EventType.CONFERENCE,
        event_category: EventCategory.INTERNAL,
        event_date: '2026-06-25T00:00:00.000Z',
        venue: 'EAII Headquarters',
        participants: [
          {
            role: ParticipantRole.PARTNER_PARTICIPANT,
            full_name: 'Partner A',
            organization_name: 'UNDP',
          },
        ],
        documents: [
          {
            attachment_type: AttachmentType.AGENDA,
            file_name: 'agenda.pdf',
            file_url: 'https://...',
          },
        ],
      };

      const mockResult = {
        id: 'event-1',
        record_code: 'EV-2026-0001',
        ...createDto,
        status: WorkflowStatus.DRAFT,
        created_by_id: 'emp-1',
      };

      prisma.eventAndVisit.count.mockResolvedValue(0);
      prisma.eventAndVisit.create.mockResolvedValue(mockResult);
      prisma.eventAndVisit.findUnique.mockResolvedValue(mockResult);

      const result = await service.create(createDto, 'emp-1');

      expect(prisma.eventAndVisit.count).toHaveBeenCalled();
      expect(prisma.eventAndVisit.create).toHaveBeenCalled();
      expect(prisma.eventVisitParticipant.createMany).toHaveBeenCalledWith({
        data: [
          {
            event_visit_id: 'event-1',
            role: ParticipantRole.PARTNER_PARTICIPANT,
            full_name: 'Partner A',
            organization_name: 'UNDP',
            division: undefined,
            position: undefined,
            email: undefined,
            phone_number: undefined,
            participant_type: undefined,
            country: undefined,
            status: undefined,
          },
        ],
      });
      expect(prisma.eventVisitDocument.createMany).toHaveBeenCalledWith({
        data: [
          {
            event_visit_id: 'event-1',
            attachment_type: AttachmentType.AGENDA,
            file_name: 'agenda.pdf',
            file_url: 'https://...',
            uploaded_by_id: 'emp-1',
          },
        ],
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    const existingRecord = {
      id: 'event-1',
      event_name: 'AI Summit',
      status: WorkflowStatus.DRAFT,
      created_by_id: 'emp-1',
    };

    it('should throw NotFoundException if record does not exist', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue(null);
      await expect(
        service.update('invalid-id', { event_name: 'New Name' }, 'emp-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if record status is not DRAFT or REJECTED', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue({
        ...existingRecord,
        status: WorkflowStatus.APPROVED,
      });
      await expect(
        service.update('event-1', { event_name: 'New Name' }, 'emp-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if current employee is not the creator', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue(existingRecord);
      await expect(
        service.update('event-1', { event_name: 'New Name' }, 'emp-different'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update successfully and recreate nested relations if provided', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue(existingRecord);
      prisma.eventAndVisit.update.mockResolvedValue({
        ...existingRecord,
        event_name: 'New Name',
      });

      const updateDto = {
        event_name: 'New Name',
        participants: [],
        documents: [],
      };

      const result = await service.update('event-1', updateDto, 'emp-1');
      expect(prisma.eventAndVisit.update).toHaveBeenCalled();
      expect(prisma.eventVisitParticipant.deleteMany).toHaveBeenCalledWith({ where: { event_visit_id: 'event-1' } });
      expect(prisma.eventVisitDocument.deleteMany).toHaveBeenCalledWith({ where: { event_visit_id: 'event-1' } });
    });
  });

  describe('submit', () => {
    it('should transition status to SUBMITTED if currently DRAFT or REJECTED', async () => {
      const draftRecord = { id: 'event-1', status: WorkflowStatus.DRAFT, created_by_id: 'emp-1' };
      prisma.eventAndVisit.findUnique.mockResolvedValue(draftRecord);
      prisma.eventAndVisit.update.mockResolvedValue({ ...draftRecord, status: WorkflowStatus.SUBMITTED });

      const result = await service.submit('event-1', 'emp-1');
      expect(prisma.eventAndVisit.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { status: WorkflowStatus.SUBMITTED },
        include: expect.any(Object),
      });
      expect(result.status).toBe(WorkflowStatus.SUBMITTED);
    });
  });

  describe('verify (review)', () => {
    it('should set reviewed_by_id on record', async () => {
      const submittedRecord = { id: 'event-1', status: WorkflowStatus.SUBMITTED };
      prisma.eventAndVisit.findUnique.mockResolvedValue(submittedRecord);
      prisma.eventAndVisit.update.mockResolvedValue({ ...submittedRecord, reviewed_by_id: 'reviewer-1' });

      const result = await service.verify('event-1', { note: 'Reviewed' }, 'reviewer-1');
      expect(prisma.eventAndVisit.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { reviewed_by_id: 'reviewer-1' },
        include: expect.any(Object),
      });
    });
  });

  describe('approve', () => {
    it('should approve event and set status and approved_by_id', async () => {
      const existing = {
        id: 'event-1',
        status: WorkflowStatus.ASSIGNED,
      };
      prisma.eventAndVisit.findUnique.mockResolvedValue(existing);
      prisma.eventAndVisit.update.mockResolvedValue({
        ...existing,
        status: WorkflowStatus.APPROVED,
        approved_by_id: 'approver-1',
      });

      const result = await service.approve(
        'event-1',
        { status: 'APPROVED' },
        'approver-1',
      );
      expect(prisma.eventAndVisit.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          status: 'APPROVED',
          approved_by_id: 'approver-1',
          rejection_reason: null,
        },
        include: expect.any(Object),
      });
      expect(result.status).toBe(WorkflowStatus.APPROVED);
    });

    it('should reject event and set status and rejection_reason', async () => {
      const existing = {
        id: 'event-1',
        status: WorkflowStatus.SUBMITTED,
      };
      prisma.eventAndVisit.findUnique.mockResolvedValue(existing);
      prisma.eventAndVisit.update.mockResolvedValue({
        ...existing,
        status: WorkflowStatus.REJECTED,
        rejection_reason: 'Too expensive',
      });

      const result = await service.approve(
        'event-1',
        { status: 'REJECTED', rejection_reason: 'Too expensive' },
        'approver-1',
      );
      expect(prisma.eventAndVisit.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          status: 'REJECTED',
          rejection_reason: 'Too expensive',
          approved_by_id: null,
        },
        include: expect.any(Object),
      });
      expect(result.status).toBe(WorkflowStatus.REJECTED);
    });
  });

  describe('assign', () => {
    it('should assign employee and update status to ASSIGNED', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue({ id: 'event-1', status: WorkflowStatus.SUBMITTED });
      prisma.employee.findUnique.mockResolvedValue({ id: 'emp-2' });
      prisma.eventAndVisit.update.mockResolvedValue({ id: 'event-1', assigned_to_id: 'emp-2', status: WorkflowStatus.ASSIGNED });

      const result = await service.assign('event-1', { employee_id: 'emp-2' });
      expect(prisma.eventAndVisit.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { assigned_to_id: 'emp-2', status: WorkflowStatus.ASSIGNED },
        include: expect.any(Object),
      });
      expect(result.status).toBe(WorkflowStatus.ASSIGNED);
    });
  });
});
