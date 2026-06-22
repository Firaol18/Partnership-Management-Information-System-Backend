import { Test, TestingModule } from '@nestjs/testing';
import { PartnershipOpportunityService } from './partnership-opportunity.service';
import { DatabaseService } from '../../common/database/database.service';
import {
  SourceOfOpportunity,
  StrategicAlignment,
  ExpectedBenefit,
  OppScreeningStatus,
  OppVerificationStatus,
  OppReviewStatus,
  OppApprovalStatus,
} from './dto';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PartnershipOpportunityService', () => {
  let service: PartnershipOpportunityService;
  let prisma: any;

  const mockPrisma = {
    partnershipOpportunity: {
      create: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
    },
  };

  const mockRecord = {
    id: 'opp-1',
    opportunity_code: 'OPP-2026-0001',
    title: 'NLP Research',
    screening_status: OppScreeningStatus.PENDING,
    verification_status: OppVerificationStatus.PENDING,
    review_status: OppReviewStatus.PENDING,
    approval_status: OppApprovalStatus.PENDING,
    forwarded_to_division_id: null,
    created_by_id: 'emp-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnershipOpportunityService,
        { provide: DatabaseService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PartnershipOpportunityService>(PartnershipOpportunityService);
    prisma = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an opportunity with auto-generated code', async () => {
      prisma.partnershipOpportunity.count.mockResolvedValue(0);
      prisma.partnershipOpportunity.create.mockResolvedValue({ ...mockRecord });

      const dto = {
        title: 'NLP Research',
        date_identified: '2026-06-20T00:00:00.000Z',
        source_of_opportunity: SourceOfOpportunity.PARTNER_PROPOSAL,
        description: 'Desc',
        strategic_alignment: [StrategicAlignment.AI_RESEARCH],
        expected_benefits: [ExpectedBenefit.JOINT_RESEARCH],
      };

      const result = await service.create(dto, 'emp-1');
      expect(prisma.partnershipOpportunity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            opportunity_code: 'OPP-2026-0001',
            title: 'NLP Research',
            created_by_id: 'emp-1',
          }),
        }),
      );
      expect(result.opportunity_code).toBe('OPP-2026-0001');
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if already screened', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue({
        ...mockRecord,
        screening_status: OppScreeningStatus.SCREENED,
      });
      await expect(
        service.update('opp-1', { title: 'New' }, 'emp-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if not creator', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(mockRecord);
      await expect(
        service.update('opp-1', { title: 'New' }, 'emp-different'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update successfully if valid', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(mockRecord);
      prisma.partnershipOpportunity.update.mockResolvedValue({ ...mockRecord, title: 'Updated' });

      const result = await service.update('opp-1', { title: 'Updated' }, 'emp-1');
      expect(result.title).toBe('Updated');
    });
  });

  describe('screen', () => {
    it('should screen an opportunity', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(mockRecord);
      prisma.partnershipOpportunity.update.mockResolvedValue({
        ...mockRecord,
        screening_status: OppScreeningStatus.SCREENED,
      });

      const result = await service.screen('opp-1', { status: OppScreeningStatus.SCREENED }, 'emp-2');
      expect(prisma.partnershipOpportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ screening_status: OppScreeningStatus.SCREENED }),
        }),
      );
    });
  });

  describe('verify', () => {
    it('should throw BadRequestException if not yet screened', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(mockRecord); // screening_status: PENDING
      await expect(
        service.verify('opp-1', { status: OppVerificationStatus.VERIFIED }, 'emp-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify if screened', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue({
        ...mockRecord,
        screening_status: OppScreeningStatus.SCREENED,
      });
      prisma.partnershipOpportunity.update.mockResolvedValue({
        ...mockRecord,
        verification_status: OppVerificationStatus.VERIFIED,
      });

      const result = await service.verify('opp-1', { status: OppVerificationStatus.VERIFIED }, 'emp-2');
      expect(result.verification_status).toBe(OppVerificationStatus.VERIFIED);
    });
  });

  describe('forward', () => {
    it('should throw BadRequestException if not verified', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(mockRecord); // verification: PENDING
      await expect(
        service.forward('opp-1', { division_id: 'div-1' }, 'emp-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if division does not exist', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue({
        ...mockRecord,
        verification_status: OppVerificationStatus.VERIFIED,
      });
      prisma.group.findUnique.mockResolvedValue(null);
      await expect(
        service.forward('opp-1', { division_id: 'invalid-div' }, 'emp-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should forward successfully', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue({
        ...mockRecord,
        verification_status: OppVerificationStatus.VERIFIED,
      });
      prisma.group.findUnique.mockResolvedValue({ id: 'div-1', name: 'AI Division' });
      prisma.partnershipOpportunity.update.mockResolvedValue({
        ...mockRecord,
        forwarded_to_division_id: 'div-1',
      });

      const result = await service.forward('opp-1', { division_id: 'div-1' }, 'emp-2');
      expect(result.forwarded_to_division_id).toBe('div-1');
    });
  });

  describe('approve', () => {
    it('should throw BadRequestException if not reviewed', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(mockRecord); // review: PENDING
      await expect(
        service.approve('opp-1', { status: OppApprovalStatus.APPROVED }, 'emp-3'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve if reviewed (transfers to waiting list)', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue({
        ...mockRecord,
        review_status: OppReviewStatus.REVIEWED,
      });
      prisma.partnershipOpportunity.update.mockResolvedValue({
        ...mockRecord,
        approval_status: OppApprovalStatus.APPROVED,
      });

      const result = await service.approve('opp-1', { status: OppApprovalStatus.APPROVED }, 'emp-3');
      expect(result.approval_status).toBe(OppApprovalStatus.APPROVED);
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException if already screened', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue({
        ...mockRecord,
        screening_status: OppScreeningStatus.SCREENED,
      });
      await expect(service.remove('opp-1', 'emp-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(null);
      await expect(service.remove('invalid', 'emp-1')).rejects.toThrow(NotFoundException);
    });
  });
});
