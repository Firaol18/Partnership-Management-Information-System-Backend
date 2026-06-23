import { Test, TestingModule } from '@nestjs/testing';
import { EventAndVisitService } from './event-and-visit.service';
import { DatabaseService } from '../../common/database/database.service';
import { EventType, VerificationStatus, ApprovalStatus } from './dto';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('EventAndVisitService', () => {
  let service: EventAndVisitService;
  let prisma: any;

  const mockPrisma = {
    eventAndVisit: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
        event_name: 'AI Summit',
        event_type: EventType.CONFERENCE,
        date: '2026-06-25T09:00:00.000Z',
        venue: 'EAII Headquarters',
        partner_representatives: [
          { name: 'Partner A', organization: 'UNDP' },
        ],
        eaii_representatives: [
          { name: 'EAII B', position: 'Director' },
        ],
        agreements_reached: 'Agreements',
        action_points: 'Action points',
      };
      const mockResult = { id: 'event-1', ...createDto, created_by_id: 'emp-1' };
      prisma.eventAndVisit.create.mockResolvedValue(mockResult);

      const result = await service.create(createDto, 'emp-1');
      expect(prisma.eventAndVisit.create).toHaveBeenCalledWith({
        data: {
          event_name: createDto.event_name,
          event_type: createDto.event_type,
          date: new Date(createDto.date),
          venue: createDto.venue,
          partner_representatives: createDto.partner_representatives,
          eaii_representatives: createDto.eaii_representatives,
          agreements_reached: createDto.agreements_reached,
          action_points: createDto.action_points,
          created_by_id: 'emp-1',
        },
        include: {
          created_by: {
            select: { id: true, name: true, username: true },
          },
        },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    const existingRecord = {
      id: 'event-1',
      event_name: 'AI Summit',
      verification_status: VerificationStatus.PENDING,
      approval_status: ApprovalStatus.PENDING,
      created_by_id: 'emp-1',
    };

    it('should throw NotFoundException if event does not exist', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue(null);
      await expect(
        service.update('invalid-id', { event_name: 'New Name' }, 'emp-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if event is already verified', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue({
        ...existingRecord,
        verification_status: VerificationStatus.VERIFIED,
      });
      await expect(
        service.update('event-1', { event_name: 'New Name' }, 'emp-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if event is already approved', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue({
        ...existingRecord,
        approval_status: ApprovalStatus.APPROVED,
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

    it('should update the event successfully if valid', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue(existingRecord);
      prisma.eventAndVisit.update.mockResolvedValue({
        ...existingRecord,
        event_name: 'New Name',
      });

      const result = await service.update('event-1', { event_name: 'New Name' }, 'emp-1');
      expect(result.event_name).toBe('New Name');
      expect(prisma.eventAndVisit.update).toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    it('should verify event and update status', async () => {
      const existing = {
        id: 'event-1',
        verification_status: VerificationStatus.PENDING,
      };
      prisma.eventAndVisit.findUnique.mockResolvedValue(existing);
      prisma.eventAndVisit.update.mockResolvedValue({
        ...existing,
        verification_status: VerificationStatus.VERIFIED,
      });

      const result = await service.verify(
        'event-1',
        { status: VerificationStatus.VERIFIED, note: 'Looks good' },
        'verifier-1',
      );
      expect(prisma.eventAndVisit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verification_status: VerificationStatus.VERIFIED,
            verification_note: 'Looks good',
            verified_by_id: 'verifier-1',
          }),
        }),
      );
    });
  });

  describe('approve', () => {
    it('should throw BadRequestException if event is not verified and being approved', async () => {
      const existing = {
        id: 'event-1',
        verification_status: VerificationStatus.PENDING,
        approval_status: ApprovalStatus.PENDING,
      };
      prisma.eventAndVisit.findUnique.mockResolvedValue(existing);

      await expect(
        service.approve('event-1', { status: ApprovalStatus.APPROVED, note: 'Approve now' }, 'approver-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve event if verified', async () => {
      const existing = {
        id: 'event-1',
        verification_status: VerificationStatus.VERIFIED,
        approval_status: ApprovalStatus.PENDING,
      };
      prisma.eventAndVisit.findUnique.mockResolvedValue(existing);
      prisma.eventAndVisit.update.mockResolvedValue({
        ...existing,
        approval_status: ApprovalStatus.APPROVED,
      });

      const result = await service.approve(
        'event-1',
        { status: ApprovalStatus.APPROVED, note: 'Approved' },
        'approver-1',
      );
      expect(prisma.eventAndVisit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approval_status: ApprovalStatus.APPROVED,
            approval_note: 'Approved',
            approved_by_id: 'approver-1',
          }),
        }),
      );
    });
  });

  describe('assign', () => {
    it('should throw NotFoundException if assigned employee does not exist', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue({ id: 'event-1' });
      prisma.employee.findUnique.mockResolvedValue(null);

      await expect(
        service.assign('event-1', { employee_id: 'invalid-emp' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should assign employee successfully if they exist', async () => {
      prisma.eventAndVisit.findUnique.mockResolvedValue({ id: 'event-1' });
      prisma.employee.findUnique.mockResolvedValue({ id: 'emp-2' });
      prisma.eventAndVisit.update.mockResolvedValue({ id: 'event-1', assigned_employee_id: 'emp-2' });

      const result = await service.assign('event-1', { employee_id: 'emp-2' });
      expect(prisma.eventAndVisit.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { assigned_employee_id: 'emp-2' },
        include: {
          created_by: { select: { id: true, name: true, username: true } },
          assigned_employee: { select: { id: true, name: true, username: true } },
        },
      });
      expect(result.assigned_employee_id).toBe('emp-2');
    });
  });
});
