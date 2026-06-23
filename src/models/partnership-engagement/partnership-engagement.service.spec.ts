import { Test, TestingModule } from '@nestjs/testing';
import { PartnershipEngagementService } from './partnership-engagement.service';
import { DatabaseService } from '../../common/database/database.service';
import {
  EngagementSource,
  EngagementStatus,
  VerificationStatus,
  ApprovalStatus,
  EngagementType,
  AttachmentType,
} from './dto';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PartnershipEngagementService', () => {
  let service: PartnershipEngagementService;
  let prisma: any;

  const mockPrisma = {
    partnershipOpportunity: {
      findUnique: jest.fn(),
    },
    partner: {
      findUnique: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
    partnershipEngagement: {
      create: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockOpportunity = {
    id: 'opp-123',
    approval_status: 'APPROVED',
  };

  const mockPartner = {
    id: 'part-123',
    name: 'UNICEF',
  };

  const mockOfficer = {
    id: 'emp-123',
    name: 'Abebe Kelemu',
    username: 'abebe',
  };

  const mockEngagement = {
    id: 'eng-123',
    engagement_code: 'ENG-2026-0001',
    source: EngagementSource.OPPORTUNITY,
    partner_id: 'part-123',
    partnership_opportunity_id: 'opp-123',
    assigned_officer_id: 'emp-123',
    status: EngagementStatus.ASSIGNED,
    created_by_id: 'creator-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnershipEngagementService,
        { provide: DatabaseService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PartnershipEngagementService>(PartnershipEngagementService);
    prisma = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFromOpportunity', () => {
    it('should throw NotFoundException if opportunity does not exist', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(null);
      await expect(
        service.createFromOpportunity(
          {
            partnership_opportunity_id: 'invalid-opp',
            partner_id: 'part-123',
            assigned_officer_id: 'emp-123',
          },
          'creator-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if opportunity is not APPROVED', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue({
        ...mockOpportunity,
        approval_status: 'PENDING',
      });
      await expect(
        service.createFromOpportunity(
          {
            partnership_opportunity_id: 'opp-123',
            partner_id: 'part-123',
            assigned_officer_id: 'emp-123',
          },
          'creator-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if partner does not exist', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(mockOpportunity);
      prisma.partner.findUnique.mockResolvedValue(null);
      await expect(
        service.createFromOpportunity(
          {
            partnership_opportunity_id: 'opp-123',
            partner_id: 'invalid-part',
            assigned_officer_id: 'emp-123',
          },
          'creator-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if assigned officer does not exist', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(mockOpportunity);
      prisma.partner.findUnique.mockResolvedValue(mockPartner);
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(
        service.createFromOpportunity(
          {
            partnership_opportunity_id: 'opp-123',
            partner_id: 'part-123',
            assigned_officer_id: 'invalid-emp',
          },
          'creator-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create an opportunity-linked engagement successfully', async () => {
      prisma.partnershipOpportunity.findUnique.mockResolvedValue(mockOpportunity);
      prisma.partner.findUnique.mockResolvedValue(mockPartner);
      prisma.employee.findUnique.mockResolvedValue(mockOfficer);
      prisma.partnershipEngagement.count.mockResolvedValue(0);
      prisma.partnershipEngagement.create.mockResolvedValue(mockEngagement);

      const result = await service.createFromOpportunity(
        {
          partnership_opportunity_id: 'opp-123',
          partner_id: 'part-123',
          assigned_officer_id: 'emp-123',
        },
        'creator-123',
      );

      expect(prisma.partnershipEngagement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: EngagementSource.OPPORTUNITY,
            partnership_opportunity_id: 'opp-123',
            partner_id: 'part-123',
            assigned_officer_id: 'emp-123',
            engagement_code: 'ENG-2026-0001',
          }),
        }),
      );
      expect(result).toEqual(mockEngagement);
    });
  });

  describe('createDirect', () => {
    it('should throw NotFoundException if partner does not exist', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);
      await expect(
        service.createDirect(
          {
            partner_id: 'invalid-part',
            assigned_officer_id: 'emp-123',
          },
          'creator-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if officer does not exist', async () => {
      prisma.partner.findUnique.mockResolvedValue(mockPartner);
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(
        service.createDirect(
          {
            partner_id: 'part-123',
            assigned_officer_id: 'invalid-emp',
          },
          'creator-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create direct engagement successfully', async () => {
      prisma.partner.findUnique.mockResolvedValue(mockPartner);
      prisma.employee.findUnique.mockResolvedValue(mockOfficer);
      prisma.partnershipEngagement.count.mockResolvedValue(5);
      const directEng = {
        ...mockEngagement,
        source: EngagementSource.DIRECT,
        partnership_opportunity_id: null,
        engagement_code: 'ENG-2026-0006',
      };
      prisma.partnershipEngagement.create.mockResolvedValue(directEng);

      const result = await service.createDirect(
        {
          partner_id: 'part-123',
          assigned_officer_id: 'emp-123',
        },
        'creator-123',
      );

      expect(prisma.partnershipEngagement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: EngagementSource.DIRECT,
            partner_id: 'part-123',
            assigned_officer_id: 'emp-123',
            engagement_code: 'ENG-2026-0006',
          }),
        }),
      );
      expect(result).toEqual(directEng);
    });
  });

  describe('submit', () => {
    it('should throw NotFoundException if engagement not found', async () => {
      prisma.partnershipEngagement.findUnique.mockResolvedValue(null);
      await expect(
        service.submit('invalid-id', {} as any, 'emp-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if engagement status is not ASSIGNED or REJECTED', async () => {
      prisma.partnershipEngagement.findUnique.mockResolvedValue({
        ...mockEngagement,
        status: EngagementStatus.SUBMITTED,
      });
      await expect(
        service.submit('eng-123', {} as any, 'emp-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if current officer is not the assigned officer', async () => {
      prisma.partnershipEngagement.findUnique.mockResolvedValue(mockEngagement);
      await expect(
        service.submit('eng-123', {} as any, 'emp-different'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should submit engagement successfully', async () => {
      prisma.partnershipEngagement.findUnique.mockResolvedValue(mockEngagement);
      const submitDto = {
        date: '2026-06-25T09:00:00.000Z',
        engagement_type: EngagementType.MEETING,
        partner_representatives: [{ name: 'Partner A', organization: 'UNDP' }],
        eaii_representatives: [{ name: 'EAII B', position: 'Director' }],
        key_points: 'NLP research discussion',
        agreed_action: 'MOU signing next week',
        next_steps: 'MOU draft preparation',
        attachments: [{ type: AttachmentType.MEETING_MINUTE, url: 'http://docs.com/minute.pdf' }],
      };

      prisma.partnershipEngagement.update.mockResolvedValue({
        ...mockEngagement,
        ...submitDto,
        status: EngagementStatus.SUBMITTED,
      });

      const result = await service.submit('eng-123', submitDto, 'emp-123');

      expect(prisma.partnershipEngagement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eng-123' },
          data: expect.objectContaining({
            status: EngagementStatus.SUBMITTED,
            key_points: 'NLP research discussion',
          }),
        }),
      );
      expect(result.status).toBe(EngagementStatus.SUBMITTED);
    });
  });

  describe('review', () => {
    it('should throw BadRequestException if not in SUBMITTED status', async () => {
      prisma.partnershipEngagement.findUnique.mockResolvedValue(mockEngagement); // ASSIGNED status
      await expect(
        service.review(
          'eng-123',
          { status: VerificationStatus.VERIFIED, note: 'Reviewed' },
          'reviewer-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify/review engagement successfully', async () => {
      prisma.partnershipEngagement.findUnique.mockResolvedValue({
        ...mockEngagement,
        status: EngagementStatus.SUBMITTED,
      });

      prisma.partnershipEngagement.update.mockResolvedValue({
        ...mockEngagement,
        status: EngagementStatus.VERIFIED,
        review_status: VerificationStatus.VERIFIED,
      });

      const result = await service.review(
        'eng-123',
        { status: VerificationStatus.VERIFIED, note: 'Looks good' },
        'reviewer-123',
      );

      expect(prisma.partnershipEngagement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: EngagementStatus.VERIFIED,
            review_status: VerificationStatus.VERIFIED,
            reviewed_by_id: 'reviewer-123',
          }),
        }),
      );
      expect(result.status).toBe(EngagementStatus.VERIFIED);
    });
  });

  describe('approve', () => {
    it('should throw BadRequestException if not in VERIFIED status', async () => {
      prisma.partnershipEngagement.findUnique.mockResolvedValue(mockEngagement); // ASSIGNED status
      await expect(
        service.approve(
          'eng-123',
          { status: ApprovalStatus.APPROVED, note: 'Approved' },
          'approver-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve engagement successfully', async () => {
      prisma.partnershipEngagement.findUnique.mockResolvedValue({
        ...mockEngagement,
        status: EngagementStatus.VERIFIED,
      });

      prisma.partnershipEngagement.update.mockResolvedValue({
        ...mockEngagement,
        status: EngagementStatus.APPROVED,
        approval_status: ApprovalStatus.APPROVED,
      });

      const result = await service.approve(
        'eng-123',
        { status: ApprovalStatus.APPROVED, note: 'All set' },
        'approver-123',
      );

      expect(prisma.partnershipEngagement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: EngagementStatus.APPROVED,
            approval_status: ApprovalStatus.APPROVED,
            approved_by_id: 'approver-123',
          }),
        }),
      );
      expect(result.status).toBe(EngagementStatus.APPROVED);
    });
  });
});
