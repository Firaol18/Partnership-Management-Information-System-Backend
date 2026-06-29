import { Test, TestingModule } from '@nestjs/testing';
import { EventAndVisitController } from './event-and-visit.controller';
import { EventAndVisitService } from './event-and-visit.service';
import { EmployeeAuthGuard } from '../../common/guards/employee-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MainType, EventType, EventCategory, WorkflowStatus } from '@prisma/client';

describe('EventAndVisitController', () => {
  let controller: EventAndVisitController;
  let service: any;

  const mockService = {
    create: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    submit: jest.fn(),
    verify: jest.fn(),
    approve: jest.fn(),
    assign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventAndVisitController],
      providers: [
        { provide: EventAndVisitService, useValue: mockService },
      ],
    })
      .overrideGuard(EmployeeAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EventAndVisitController>(EventAndVisitController);
    service = module.get<EventAndVisitService>(EventAndVisitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct data', async () => {
      const createDto = {
        main_type: MainType.EVENT,
        event_name: 'AI Summit',
        event_type: EventType.CONFERENCE,
        event_category: EventCategory.INTERNAL,
        event_date: '2026-06-25T00:00:00.000Z',
        venue: 'EAII Headquarters',
        participants: [],
        documents: [],
      };
      const userClaim = { user: { sub: 'emp-1', username: 'testuser', role: 'Staff' } } as any;
      service.create.mockResolvedValue({ id: 'event-1', ...createDto });

      const result = await controller.create(createDto, userClaim);
      expect(service.create).toHaveBeenCalledWith(createDto, 'emp-1');
      expect(result.id).toBe('event-1');
    });
  });

  describe('findAllPaginated', () => {
    it('should call service.findAllPaginated with query', async () => {
      const query = { page: 1, limit: 10, search: 'AI' };
      service.findAllPaginated.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.findAllPaginated(query);
      expect(service.findAllPaginated).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      service.findOne.mockResolvedValue({ id: 'event-1' });

      const result = await controller.findOne('event-1');
      expect(service.findOne).toHaveBeenCalledWith('event-1');
      expect(result.id).toBe('event-1');
    });
  });

  describe('update', () => {
    it('should call service.update with id and body', async () => {
      const updateDto = { event_name: 'New Summit' };
      const userClaim = { user: { sub: 'emp-1' } } as any;
      service.update.mockResolvedValue({ id: 'event-1', event_name: 'New Summit' });

      const result = await controller.update('event-1', updateDto, userClaim);
      expect(service.update).toHaveBeenCalledWith('event-1', updateDto, 'emp-1');
      expect(result.event_name).toBe('New Summit');
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      const userClaim = { user: { sub: 'emp-1' } } as any;
      service.remove.mockResolvedValue({ message: 'deleted' });

      const result = await controller.remove('event-1', userClaim);
      expect(service.remove).toHaveBeenCalledWith('event-1', 'emp-1');
      expect(result.message).toBe('deleted');
    });
  });

  describe('submit', () => {
    it('should call service.submit with id and sub', async () => {
      const userClaim = { user: { sub: 'emp-1' } } as any;
      service.submit.mockResolvedValue({ id: 'event-1', status: WorkflowStatus.SUBMITTED });

      const result = await controller.submit('event-1', userClaim);
      expect(service.submit).toHaveBeenCalledWith('event-1', 'emp-1');
      expect(result.status).toBe(WorkflowStatus.SUBMITTED);
    });
  });

  describe('verify', () => {
    it('should call service.verify with id and body', async () => {
      const verifyDto = { note: 'Good' };
      const userClaim = { user: { sub: 'reviewer-1' } } as any;
      service.verify.mockResolvedValue({ id: 'event-1', reviewed_by_id: 'reviewer-1' });

      const result = await controller.verify('event-1', verifyDto, userClaim);
      expect(service.verify).toHaveBeenCalledWith('event-1', verifyDto, 'reviewer-1');
      expect(result.reviewed_by_id).toBe('reviewer-1');
    });
  });

  describe('approve', () => {
    it('should call service.approve with id and body', async () => {
      const approveDto = { status: 'APPROVED' as const };
      const userClaim = { user: { sub: 'approver-1' } } as any;
      service.approve.mockResolvedValue({ id: 'event-1', status: WorkflowStatus.APPROVED });

      const result = await controller.approve('event-1', approveDto, userClaim);
      expect(service.approve).toHaveBeenCalledWith('event-1', approveDto, 'approver-1');
      expect(result.status).toBe(WorkflowStatus.APPROVED);
    });
  });

  describe('assign', () => {
    it('should call service.assign with id and employee_id', async () => {
      const assignDto = { employee_id: 'emp-2' };
      service.assign.mockResolvedValue({ id: 'event-1', assigned_to_id: 'emp-2' });

      const result = await controller.assign('event-1', assignDto);
      expect(service.assign).toHaveBeenCalledWith('event-1', assignDto);
      expect(result.assigned_to_id).toBe('emp-2');
    });
  });
});
