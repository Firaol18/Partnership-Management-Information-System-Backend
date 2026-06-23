import { Test, TestingModule } from '@nestjs/testing';
import { PartnershipAgreementService } from './partnership-agreement.service';
import { DatabaseService } from '../../common/database/database.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  AgreementType,
  AgreementStatus,
  AgreementLegalReviewStatus,
  AgreementApprovalStatus,
  CreatePartnershipAgreementDto,
  UpdatePartnershipAgreementDto,
  LegalReviewPartnershipAgreementDto,
  ApprovePartnershipAgreementDto,
  SearchPartnershipAgreementDto,
} from './dto';

const mockPrisma = {
  partner: { findUnique: jest.fn() },
  group: { findUnique: jest.fn() },
  partnershipEngagement: { findUnique: jest.fn() },
  partnershipAgreement: {
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockPartner = { id: 'partner-123', name: 'UNDP' };
const mockDivision = { id: 'div-123', name: 'Research Division' };
const mockEngagement = { id: 'eng-123', engagement_code: 'ENG-2026-0001', status: 'APPROVED' };

const mockAgreement = {
  id: 'agr-123',
  agreement_code: 'AGR-2026-0001',
  title: 'MOU with UNDP',
  agreement_type: AgreementType.MOU,
  status: AgreementStatus.DRAFT,
  partner_id: 'partner-123',
  eaii_responsible_division_id: null,
  partnership_engagement_id: null,
  start_date: null,
  end_date: null,
  renewal_date: null,
  signatories: [],
  signing_date: null,
  draft_versions: [],
  signed_version: null,
  amendments: [],
  legal_review_status: AgreementLegalReviewStatus.PENDING,
  legal_review_note: null,
  legal_reviewed_by_id: null,
  legal_reviewed_at: null,
  approval_status: AgreementApprovalStatus.PENDING,
  approval_note: null,
  approved_by_id: null,
  approved_at: null,
  created_by_id: 'employee-001',
  created_at: new Date(),
  updated_at: new Date(),
};

describe('PartnershipAgreementService', () => {
  let service: PartnershipAgreementService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnershipAgreementService,
        { provide: DatabaseService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PartnershipAgreementService>(PartnershipAgreementService);
    prisma = mockPrisma;
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreatePartnershipAgreementDto = {
      title: 'MOU with UNDP',
      agreement_type: AgreementType.MOU,
      partner_id: 'partner-123',
    };

    it('should create a partnership agreement successfully', async () => {
      prisma.partner.findUnique.mockResolvedValue(mockPartner);
      prisma.partnershipAgreement.count.mockResolvedValue(0);
      prisma.partnershipAgreement.create.mockResolvedValue(mockAgreement);

      const result = await service.create(dto, 'employee-001');
      expect(result).toEqual(mockAgreement);
      expect(prisma.partnershipAgreement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agreement_code: 'AGR-2026-0001',
            title: dto.title,
            agreement_type: dto.agreement_type,
            partner_id: dto.partner_id,
            status: AgreementStatus.DRAFT,
            created_by_id: 'employee-001',
          }),
        }),
      );
    });

    it('should throw NotFoundException if partner not found', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);
      await expect(service.create(dto, 'employee-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if division not found', async () => {
      prisma.partner.findUnique.mockResolvedValue(mockPartner);
      prisma.group.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ ...dto, eaii_responsible_division_id: 'bad-div' }, 'employee-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if engagement not found', async () => {
      prisma.partner.findUnique.mockResolvedValue(mockPartner);
      prisma.partnershipEngagement.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ ...dto, partnership_engagement_id: 'bad-eng' }, 'employee-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto: UpdatePartnershipAgreementDto = { title: 'Updated Title' };

    it('should update agreement in DRAFT status', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...mockAgreement,
        title: 'Updated Title',
      });

      const result = await service.update('agr-123', dto, 'employee-001');
      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException if agreement not found', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(null);
      await expect(service.update('bad-id', dto, 'employee-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if not in DRAFT or REJECTED status', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.UNDER_REVIEW,
      });
      await expect(service.update('agr-123', dto, 'employee-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── submitForLegalReview ─────────────────────────────────────────────────

  describe('submitForLegalReview', () => {
    it('should transition DRAFT to UNDER_REVIEW', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.UNDER_REVIEW,
      });

      const result = await service.submitForLegalReview('agr-123', 'employee-001');
      expect(result.status).toBe(AgreementStatus.UNDER_REVIEW);
    });

    it('should throw NotFoundException if agreement not found', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(null);
      await expect(
        service.submitForLegalReview('bad-id', 'employee-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not in DRAFT or REJECTED', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.APPROVED,
      });
      await expect(
        service.submitForLegalReview('agr-123', 'employee-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── legalReview ──────────────────────────────────────────────────────────

  describe('legalReview', () => {
    const underReviewAgreement = {
      ...mockAgreement,
      status: AgreementStatus.UNDER_REVIEW,
    };

    it('should verify agreement (UNDER_REVIEW → VERIFIED)', async () => {
      const dto: LegalReviewPartnershipAgreementDto = {
        status: AgreementLegalReviewStatus.VERIFIED,
        note: 'All good',
      };
      prisma.partnershipAgreement.findUnique.mockResolvedValue(underReviewAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...underReviewAgreement,
        status: AgreementStatus.VERIFIED,
        legal_review_status: AgreementLegalReviewStatus.VERIFIED,
      });

      const result = await service.legalReview('agr-123', dto, 'legal-001');
      expect(result.status).toBe(AgreementStatus.VERIFIED);
    });

    it('should reject agreement (UNDER_REVIEW → REJECTED)', async () => {
      const dto: LegalReviewPartnershipAgreementDto = {
        status: AgreementLegalReviewStatus.REJECTED,
        note: 'Missing clauses',
      };
      prisma.partnershipAgreement.findUnique.mockResolvedValue(underReviewAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...underReviewAgreement,
        status: AgreementStatus.REJECTED,
        legal_review_status: AgreementLegalReviewStatus.REJECTED,
      });

      const result = await service.legalReview('agr-123', dto, 'legal-001');
      expect(result.status).toBe(AgreementStatus.REJECTED);
    });

    it('should throw BadRequestException if not in UNDER_REVIEW', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement); // DRAFT
      await expect(
        service.legalReview(
          'agr-123',
          { status: AgreementLegalReviewStatus.VERIFIED },
          'legal-001',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── approve ──────────────────────────────────────────────────────────────

  describe('approve', () => {
    const verifiedAgreement = {
      ...mockAgreement,
      status: AgreementStatus.VERIFIED,
    };

    it('should approve agreement (VERIFIED → APPROVED)', async () => {
      const dto: ApprovePartnershipAgreementDto = {
        status: AgreementApprovalStatus.APPROVED,
        note: 'Approved for signing',
      };
      prisma.partnershipAgreement.findUnique.mockResolvedValue(verifiedAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...verifiedAgreement,
        status: AgreementStatus.APPROVED,
        approval_status: AgreementApprovalStatus.APPROVED,
      });

      const result = await service.approve('agr-123', dto, 'director-001');
      expect(result.status).toBe(AgreementStatus.APPROVED);
    });

    it('should reject agreement (VERIFIED → REJECTED)', async () => {
      const dto: ApprovePartnershipAgreementDto = {
        status: AgreementApprovalStatus.REJECTED,
        note: 'Budget constraints',
      };
      prisma.partnershipAgreement.findUnique.mockResolvedValue(verifiedAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...verifiedAgreement,
        status: AgreementStatus.REJECTED,
        approval_status: AgreementApprovalStatus.REJECTED,
      });

      const result = await service.approve('agr-123', dto, 'director-001');
      expect(result.status).toBe(AgreementStatus.REJECTED);
    });

    it('should throw BadRequestException if not in VERIFIED status', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement); // DRAFT
      await expect(
        service.approve(
          'agr-123',
          { status: AgreementApprovalStatus.APPROVED },
          'director-001',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return an agreement by id', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement);
      const result = await service.findOne('agr-123');
      expect(result).toEqual(mockAgreement);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated agreements', async () => {
      const paginatedResult = {
        data: [mockAgreement],
        meta: { total: 1, page: 1, perPage: 10 },
      };
      prisma.partnershipAgreement.findMany.mockResolvedValue([mockAgreement]);
      jest.spyOn(require('../../common/utils/paginater'), 'paginate').mockResolvedValue(paginatedResult);

      const query: SearchPartnershipAgreementDto = { page: 1, limit: 10, sort_by: 'created_at' };
      const result = await service.findAll(query);
      expect(result).toEqual(paginatedResult);
    });
  });
});
