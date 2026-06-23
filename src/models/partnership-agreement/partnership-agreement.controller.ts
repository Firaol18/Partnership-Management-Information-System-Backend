import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { PartnershipAgreementService } from './partnership-agreement.service';
import {
  CreatePartnershipAgreementDto,
  UpdatePartnershipAgreementDto,
  LegalReviewPartnershipAgreementDto,
  ApprovePartnershipAgreementDto,
  SearchPartnershipAgreementDto,
} from './dto';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Resource } from '../../common/decorators/resource.decorator';
import { RESOURCE } from '../../common/constants/resource';
import { ACTIONS } from '../../common/constants/actions';
import { EmployeeTokenClaim } from '../../common/interfaces/employee-login.interface';

@ApiTags('Partnership Agreement')
@ApiBearerAuth()
@Controller('partnership-agreement')
export class PartnershipAgreementController {
  constructor(
    private readonly partnershipAgreementService: PartnershipAgreementService,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.CREATE] },
  ])
  @ApiResponse({ status: 201, description: 'Agreement created successfully' })
  @ApiResponse({ status: 404, description: 'Partner, division, or engagement not found' })
  create(
    @Body() dto: CreatePartnershipAgreementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipAgreementService.create(dto, request.user.sub);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.UPDATE] },
  ])
  @ApiResponse({ status: 200, description: 'Agreement updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update in current status' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePartnershipAgreementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipAgreementService.update(id, dto, request.user.sub);
  }

  // ─── Submit for Legal Review ──────────────────────────────────────────────

  @Patch(':id/submit')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.UPDATE] },
  ])
  @ApiResponse({ status: 200, description: 'Agreement submitted for legal review' })
  @ApiResponse({ status: 400, description: 'Agreement must be in DRAFT or REJECTED status' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  submitForLegalReview(
    @Param('id') id: string,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipAgreementService.submitForLegalReview(
      id,
      request.user.sub,
    );
  }

  // ─── Legal Officer Review ─────────────────────────────────────────────────

  @Patch(':id/legal-review')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.VERIFY] },
  ])
  @ApiResponse({ status: 200, description: 'Legal review decision recorded (Verified / Rejected)' })
  @ApiResponse({ status: 400, description: 'Agreement must be in UNDER_REVIEW status' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  legalReview(
    @Param('id') id: string,
    @Body() dto: LegalReviewPartnershipAgreementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipAgreementService.legalReview(
      id,
      dto,
      request.user.sub,
    );
  }

  // ─── Director Approval ────────────────────────────────────────────────────

  @Patch(':id/approve')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.APPROVE] },
  ])
  @ApiResponse({ status: 200, description: 'Approval decision recorded (Approved / Rejected)' })
  @ApiResponse({ status: 400, description: 'Agreement must be in VERIFIED status' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePartnershipAgreementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipAgreementService.approve(id, dto, request.user.sub);
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  @Get('paginated')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.READ] },
  ])
  @ApiResponse({ status: 200, description: 'Paginated list of partnership agreements' })
  findAll(@Query() query: SearchPartnershipAgreementDto) {
    return this.partnershipAgreementService.findAll(query);
  }

  @Get(':id')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.READ_ONE] },
  ])
  @ApiResponse({ status: 200, description: 'Partnership Agreement details' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  findOne(@Param('id') id: string) {
    return this.partnershipAgreementService.findOne(id);
  }
}
