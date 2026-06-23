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
  UploadSignedAgreementDto,
  RenewAgreementDto,
  TerminateAgreementDto,
  SearchPartnershipAgreementDto,
} from './dto';
import { ApiBearerAuth, ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a new partnership agreement (DRAFT)' })
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
  @ApiOperation({ summary: 'Update agreement details (DRAFT status only)' })
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
  @ApiOperation({ summary: 'Submit agreement for legal review (DRAFT → UNDER_REVIEW)' })
  @ApiResponse({ status: 200, description: 'Agreement submitted for legal review' })
  @ApiResponse({ status: 400, description: 'Agreement must be in DRAFT status' })
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
  @ApiOperation({
    summary:
      'Legal officer reviews the agreement (VERIFIED: awaits director | REJECTED: returns to DRAFT)',
  })
  @ApiResponse({ status: 200, description: 'Legal review decision recorded' })
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
  @ApiOperation({
    summary:
      'Director approves or rejects the agreement (APPROVED: awaits signing | REJECTED: returns to DRAFT)',
  })
  @ApiResponse({ status: 200, description: 'Approval decision recorded' })
  @ApiResponse({
    status: 400,
    description: 'Agreement must be legally verified before director approval',
  })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePartnershipAgreementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipAgreementService.approve(id, dto, request.user.sub);
  }

  // ─── Sign ─────────────────────────────────────────────────────────────────

  @Patch(':id/sign')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.UPDATE] },
  ])
  @ApiOperation({
    summary:
      'Upload signed document and record signing date (director-approved UNDER_REVIEW → SIGNED)',
  })
  @ApiResponse({ status: 200, description: 'Agreement signed and moved to SIGNED status' })
  @ApiResponse({
    status: 400,
    description:
      'Agreement must be director-approved and in UNDER_REVIEW status to sign',
  })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  sign(
    @Param('id') id: string,
    @Body() dto: UploadSignedAgreementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipAgreementService.sign(id, dto, request.user.sub);
  }

  // ─── Activate ─────────────────────────────────────────────────────────────

  @Patch(':id/activate')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.UPDATE] },
  ])
  @ApiOperation({ summary: 'Activate a signed agreement (SIGNED → ACTIVE)' })
  @ApiResponse({ status: 200, description: 'Agreement activated' })
  @ApiResponse({ status: 400, description: 'Agreement must be in SIGNED status' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  activate(@Param('id') id: string) {
    return this.partnershipAgreementService.activate(id);
  }

  // ─── Expire ───────────────────────────────────────────────────────────────

  @Patch(':id/expire')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.UPDATE] },
  ])
  @ApiOperation({
    summary:
      'Mark an active agreement as expired (ACTIVE → EXPIRED). Typically called by a scheduled job.',
  })
  @ApiResponse({ status: 200, description: 'Agreement marked as expired' })
  @ApiResponse({ status: 400, description: 'Agreement must be in ACTIVE status' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  expire(@Param('id') id: string) {
    return this.partnershipAgreementService.expire(id);
  }

  // ─── Renew ────────────────────────────────────────────────────────────────

  @Patch(':id/renew')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.UPDATE] },
  ])
  @ApiOperation({
    summary:
      'Renew an active or expired agreement — extends dates and appends an amendment (ACTIVE|EXPIRED → RENEWED)',
  })
  @ApiResponse({ status: 200, description: 'Agreement renewed' })
  @ApiResponse({
    status: 400,
    description: 'Agreement must be ACTIVE or EXPIRED to renew',
  })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  renew(@Param('id') id: string, @Body() dto: RenewAgreementDto) {
    return this.partnershipAgreementService.renew(id, dto);
  }

  // ─── Terminate ────────────────────────────────────────────────────────────

  @Patch(':id/terminate')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.UPDATE] },
  ])
  @ApiOperation({
    summary:
      'Terminate a signed, active, or renewed agreement (SIGNED|ACTIVE|RENEWED → TERMINATED)',
  })
  @ApiResponse({ status: 200, description: 'Agreement terminated' })
  @ApiResponse({
    status: 400,
    description: 'Agreement must be SIGNED, ACTIVE, or RENEWED to terminate',
  })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  terminate(@Param('id') id: string, @Body() dto: TerminateAgreementDto) {
    return this.partnershipAgreementService.terminate(id, dto);
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  @Get('paginated')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.READ] },
  ])
  @ApiOperation({ summary: 'Paginated list of partnership agreements' })
  @ApiResponse({ status: 200, description: 'Paginated list of partnership agreements' })
  findAll(@Query() query: SearchPartnershipAgreementDto) {
    return this.partnershipAgreementService.findAll(query);
  }

  @Get(':id')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_AGREEMENT, actions: [ACTIONS.READ_ONE] },
  ])
  @ApiOperation({ summary: 'Get a single partnership agreement by ID' })
  @ApiResponse({ status: 200, description: 'Partnership Agreement details' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  findOne(@Param('id') id: string) {
    return this.partnershipAgreementService.findOne(id);
  }
}
