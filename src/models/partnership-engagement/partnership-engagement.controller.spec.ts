import { Test, TestingModule } from '@nestjs/testing';
import { PartnershipEngagementController } from './partnership-engagement.controller';
import { PartnershipEngagementService } from './partnership-engagement.service';
import { EmployeeAuthGuard } from '../../common/guards/employee-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  EngagementSource,
  EngagementStatus,
  VerificationStatus,
  ApprovalStatus,
  EngagementType,
} from './dto';

describe('PartnershipEngagementController', () => {
  let controller: PartnershipEngagementController;
  let service: any;

  const mockService = {
    createFromOpportunity: jest.fn(),
    createDirect: jest.fn(),
    submit: jest.fn(),
    review: jest.fn(),
    approve: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnershipEngagementController],
      providers: [
        { provide: PartnershipEngagementService, useValue: mockService },
      ],
    })
      .overrideGuard(EmployeeAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PartnershipEngagementController>(
      PartnershipEngagementController,
    );
    service = module.get<PartnershipEngagementService>(
      PartnershipEngagementService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createFromOpportunity', () => {
    it('should call service.createFromOpportunity', async () => {
      const dto = {
        partnership_opportunity_id: 'opp-123',
        partner_id: 'part-123',
        assigned_officer_id: 'emp-123',
      };
      const request = { user: { sub: 'creator-123' } } as any;
      service.createFromOpportunity.mockResolvedValue({ id: 'eng-123', ...dto });

      const result = await controller.createFromOpportunity(dto, request);
      expect(service.createFromOpportunity).toHaveBeenCalledWith(dto, 'creator-123');
      expect(result.id).toBe('eng-123');
    });
  });

  describe('createDirect', () => {
    it('should call service.createDirect', async () => {
      const dto = {
        partner_id: 'part-123',
        assigned_officer_id: 'emp-123',
      };
      const request = { user: { sub: 'creator-123' } } as any;
      service.createDirect.mockResolvedValue({ id: 'eng-123', ...dto });

      const result = await controller.createDirect(dto, request);
      expect(service.createDirect).toHaveBeenCalledWith(dto, 'creator-123');
      expect(result.id).toBe('eng-123');
    });
  });

  describe('submit', () => {
    it('should call service.submit', async () => {
      const dto = {
        date: '2026-06-25T00:00:00.000Z',
        engagement_type: EngagementType.CALL,
        partner_representatives: [],
        eaii_representatives: [],
        key_points: 'points',
        agreed_action: 'action',
        next_steps: 'next',
      };
      const request = { user: { sub: 'emp-123' } } as any;
      service.submit.mockResolvedValue({ id: 'eng-123', status: EngagementStatus.SUBMITTED });

      const result = await controller.submit('eng-123', dto, request);
      expect(service.submit).toHaveBeenCalledWith('eng-123', dto, 'emp-123');
      expect(result.status).toBe(EngagementStatus.SUBMITTED);
    });
  });

  describe('review', () => {
    it('should call service.review', async () => {
      const dto = { status: VerificationStatus.VERIFIED, note: 'Reviewed' };
      const request = { user: { sub: 'reviewer-123' } } as any;
      service.review.mockResolvedValue({ id: 'eng-123', status: EngagementStatus.VERIFIED });

      const result = await controller.review('eng-123', dto, request);
      expect(service.review).toHaveBeenCalledWith('eng-123', dto, 'reviewer-123');
      expect(result.status).toBe(EngagementStatus.VERIFIED);
    });
  });

  describe('approve', () => {
    it('should call service.approve', async () => {
      const dto = { status: ApprovalStatus.APPROVED, note: 'Approved' };
      const request = { user: { sub: 'approver-123' } } as any;
      service.approve.mockResolvedValue({ id: 'eng-123', status: EngagementStatus.APPROVED });

      const result = await controller.approve('eng-123', dto, request);
      expect(service.approve).toHaveBeenCalledWith('eng-123', dto, 'approver-123');
      expect(result.status).toBe(EngagementStatus.APPROVED);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      const query = { page: 1, limit: 10, search: 'ENG' };
      service.findAll.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.findAll(query);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      service.findOne.mockResolvedValue({ id: 'eng-123' });

      const result = await controller.findOne('eng-123');
      expect(service.findOne).toHaveBeenCalledWith('eng-123');
      expect(result.id).toBe('eng-123');
    });
  });
});
