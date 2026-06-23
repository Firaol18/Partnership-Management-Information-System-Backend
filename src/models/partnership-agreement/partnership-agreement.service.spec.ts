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
  UploadSignedAgreementDto,
  RenewAgreementDto,
  TerminateAgreementDto,
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

/** Base agreement in DRAFT status */
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

    it('should throw BadRequestException if not in DRAFT status', async () => {
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

    it('should throw BadRequestException if not in DRAFT status', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.UNDER_REVIEW,
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

    it('should set legal_review_status=VERIFIED, status stays UNDER_REVIEW', async () => {
      const dto: LegalReviewPartnershipAgreementDto = {
        status: AgreementLegalReviewStatus.VERIFIED,
        note: 'All good',
      };
      prisma.partnershipAgreement.findUnique.mockResolvedValue(underReviewAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...underReviewAgreement,
        status: AgreementStatus.UNDER_REVIEW,
        legal_review_status: AgreementLegalReviewStatus.VERIFIED,
      });

      const result = await service.legalReview('agr-123', dto, 'legal-001');
      expect(result.legal_review_status).toBe(AgreementLegalReviewStatus.VERIFIED);
      expect(result.status).toBe(AgreementStatus.UNDER_REVIEW);
    });

    it('should set legal_review_status=REJECTED and move status to DRAFT', async () => {
      const dto: LegalReviewPartnershipAgreementDto = {
        status: AgreementLegalReviewStatus.REJECTED,
        note: 'Missing clauses',
      };
      prisma.partnershipAgreement.findUnique.mockResolvedValue(underReviewAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...underReviewAgreement,
        status: AgreementStatus.DRAFT,
        legal_review_status: AgreementLegalReviewStatus.REJECTED,
      });

      const result = await service.legalReview('agr-123', dto, 'legal-001');
      expect(result.status).toBe(AgreementStatus.DRAFT);
      expect(result.legal_review_status).toBe(AgreementLegalReviewStatus.REJECTED);
    });

    it('should throw BadRequestException if REJECTED without a note', async () => {
      const dto: LegalReviewPartnershipAgreementDto = {
        status: AgreementLegalReviewStatus.REJECTED,
      };
      prisma.partnershipAgreement.findUnique.mockResolvedValue(underReviewAgreement);
      await expect(
        service.legalReview('agr-123', dto, 'legal-001'),
      ).rejects.toThrow(BadRequestException);
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
    /** Agreement in UNDER_REVIEW and legally VERIFIED — ready for director decision */
    const verifiedAgreement = {
      ...mockAgreement,
      status: AgreementStatus.UNDER_REVIEW,
      legal_review_status: AgreementLegalReviewStatus.VERIFIED,
    };

    it('should approve — approval_status=APPROVED, status stays UNDER_REVIEW (awaiting signature)', async () => {
      const dto: ApprovePartnershipAgreementDto = {
        status: AgreementApprovalStatus.APPROVED,
        note: 'Approved for signing',
      };
      prisma.partnershipAgreement.findUnique.mockResolvedValue(verifiedAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...verifiedAgreement,
        status: AgreementStatus.UNDER_REVIEW,
        approval_status: AgreementApprovalStatus.APPROVED,
      });

      const result = await service.approve('agr-123', dto, 'director-001');
      expect(result.approval_status).toBe(AgreementApprovalStatus.APPROVED);
      // stays UNDER_REVIEW until the officer uploads the signed doc
      expect(result.status).toBe(AgreementStatus.UNDER_REVIEW);
    });

    it('should reject — approval_status=REJECTED, status moves to DRAFT', async () => {
      const dto: ApprovePartnershipAgreementDto = {
        status: AgreementApprovalStatus.REJECTED,
        note: 'Budget constraints',
      };
      prisma.partnershipAgreement.findUnique.mockResolvedValue(verifiedAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...verifiedAgreement,
        status: AgreementStatus.DRAFT,
        approval_status: AgreementApprovalStatus.REJECTED,
      });

      const result = await service.approve('agr-123', dto, 'director-001');
      expect(result.status).toBe(AgreementStatus.DRAFT);
    });

    it('should throw BadRequestException if not in UNDER_REVIEW', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement); // DRAFT
      await expect(
        service.approve(
          'agr-123',
          { status: AgreementApprovalStatus.APPROVED, note: 'ok' },
          'director-001',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if legal review not VERIFIED', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.UNDER_REVIEW,
        legal_review_status: AgreementLegalReviewStatus.PENDING,
      });
      await expect(
        service.approve(
          'agr-123',
          { status: AgreementApprovalStatus.APPROVED, note: 'ok' },
          'director-001',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if REJECTED without a note', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(verifiedAgreement);
      await expect(
        service.approve('agr-123', { status: AgreementApprovalStatus.REJECTED }, 'director-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── sign ─────────────────────────────────────────────────────────────────

  describe('sign', () => {
    const approvedAgreement = {
      ...mockAgreement,
      status: AgreementStatus.UNDER_REVIEW,
      approval_status: AgreementApprovalStatus.APPROVED,
      legal_review_status: AgreementLegalReviewStatus.VERIFIED,
    };

    const dto: UploadSignedAgreementDto = {
      signed_version: 'https://storage.example.com/signed.pdf',
      signing_date: '2026-06-23',
    };

    it('should move UNDER_REVIEW (director-approved) → SIGNED', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(approvedAgreement);
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...approvedAgreement,
        status: AgreementStatus.SIGNED,
        signed_version: dto.signed_version,
        signing_date: new Date(dto.signing_date),
      });

      const result = await service.sign('agr-123', dto, 'employee-001');
      expect(result.status).toBe(AgreementStatus.SIGNED);
      expect(result.signed_version).toBe(dto.signed_version);
    });

    it('should throw BadRequestException if not in UNDER_REVIEW', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement); // DRAFT
      await expect(service.sign('agr-123', dto, 'employee-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if approval_status is not APPROVED', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...approvedAgreement,
        approval_status: AgreementApprovalStatus.PENDING,
      });
      await expect(service.sign('agr-123', dto, 'employee-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── activate ─────────────────────────────────────────────────────────────

  describe('activate', () => {
    it('should move SIGNED → ACTIVE', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.SIGNED,
      });
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.ACTIVE,
      });

      const result = await service.activate('agr-123');
      expect(result.status).toBe(AgreementStatus.ACTIVE);
    });

    it('should throw BadRequestException if not in SIGNED status', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement); // DRAFT
      await expect(service.activate('agr-123')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── expire ───────────────────────────────────────────────────────────────

  describe('expire', () => {
    it('should move ACTIVE → EXPIRED', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.ACTIVE,
      });
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.EXPIRED,
      });

      const result = await service.expire('agr-123');
      expect(result.status).toBe(AgreementStatus.EXPIRED);
    });

    it('should throw BadRequestException if not in ACTIVE status', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement); // DRAFT
      await expect(service.expire('agr-123')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── renew ────────────────────────────────────────────────────────────────

  describe('renew', () => {
    const dto: RenewAgreementDto = {
      end_date: '2027-06-23',
      renewal_date: '2027-05-23',
      description: 'Renewed for another year',
      url: 'https://storage.example.com/renewal.pdf',
    };

    it('should renew an ACTIVE agreement → RENEWED', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.ACTIVE,
        amendments: [],
      });
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.RENEWED,
        end_date: new Date(dto.end_date),
        amendments: [
          {
            description: dto.description,
            url: dto.url,
            amended_at: expect.any(String),
          },
        ],
      });

      const result = await service.renew('agr-123', dto);
      expect(result.status).toBe(AgreementStatus.RENEWED);
    });

    it('should renew an EXPIRED agreement → RENEWED', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.EXPIRED,
        amendments: [],
      });
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.RENEWED,
      });

      const result = await service.renew('agr-123', dto);
      expect(result.status).toBe(AgreementStatus.RENEWED);
    });

    it('should throw BadRequestException if not ACTIVE or EXPIRED', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement); // DRAFT
      await expect(service.renew('agr-123', dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── terminate ────────────────────────────────────────────────────────────

  describe('terminate', () => {
    const dto: TerminateAgreementDto = {
      termination_note: 'Project completed',
    };

    it.each([
      AgreementStatus.SIGNED,
      AgreementStatus.ACTIVE,
      AgreementStatus.RENEWED,
    ])('should terminate a %s agreement → TERMINATED', async (status) => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue({
        ...mockAgreement,
        status,
      });
      prisma.partnershipAgreement.update.mockResolvedValue({
        ...mockAgreement,
        status: AgreementStatus.TERMINATED,
      });

      const result = await service.terminate('agr-123', dto);
      expect(result.status).toBe(AgreementStatus.TERMINATED);
    });

    it('should throw BadRequestException for non-terminatable status', async () => {
      prisma.partnershipAgreement.findUnique.mockResolvedValue(mockAgreement); // DRAFT
      await expect(service.terminate('agr-123', dto)).rejects.toThrow(BadRequestException);
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
