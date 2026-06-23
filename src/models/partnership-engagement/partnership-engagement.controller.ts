import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  Patch,
} from '@nestjs/common';
import { PartnershipEngagementService } from './partnership-engagement.service';
import {
  CreateEngagementFromOpportunityDto,
  CreateDirectEngagementDto,
  SubmitPartnershipEngagementDto,
  ReviewPartnershipEngagementDto,
  ApprovePartnershipEngagementDto,
  SearchPartnershipEngagementDto,
} from './dto';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Resource } from '../../common/decorators/resource.decorator';
import { RESOURCE } from '../../common/constants/resource';
import { ACTIONS } from '../../common/constants/actions';
import { EmployeeTokenClaim } from '../../common/interfaces/employee-login.interface';

@ApiTags('Partnership Engagement')
@ApiBearerAuth()
@Controller('partnership-engagement')
export class PartnershipEngagementController {
  constructor(
    private readonly partnershipEngagementService: PartnershipEngagementService,
  ) {}

  @Post('opportunity')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_ENGAGEMENT, actions: [ACTIONS.CREATE] },
  ])
  @ApiResponse({ status: 201, description: 'Engagement from opportunity created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or opportunity not on waiting list' })
  @ApiResponse({ status: 404, description: 'Opportunity, partner, or officer not found' })
  createFromOpportunity(
    @Body() dto: CreateEngagementFromOpportunityDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipEngagementService.createFromOpportunity(
      dto,
      request.user.sub,
    );
  }

  @Post('direct')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_ENGAGEMENT, actions: [ACTIONS.CREATE] },
  ])
  @ApiResponse({ status: 201, description: 'Direct engagement created successfully' })
  @ApiResponse({ status: 404, description: 'Partner or officer not found' })
  createDirect(
    @Body() dto: CreateDirectEngagementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipEngagementService.createDirect(dto, request.user.sub);
  }

  @Patch(':id/submit')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_ENGAGEMENT, actions: [ACTIONS.UPDATE] },
  ])
  @ApiResponse({ status: 200, description: 'Engagement submitted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot submit in current status' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only assigned officer can submit' })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitPartnershipEngagementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipEngagementService.submit(id, dto, request.user.sub);
  }

  @Patch(':id/review')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_ENGAGEMENT, actions: [ACTIONS.VERIFY] },
  ])
  @ApiResponse({ status: 200, description: 'Engagement reviewed/verified successfully' })
  @ApiResponse({ status: 400, description: 'Engagement must be in SUBMITTED status' })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewPartnershipEngagementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipEngagementService.review(id, dto, request.user.sub);
  }

  @Patch(':id/approve')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_ENGAGEMENT, actions: [ACTIONS.APPROVE] },
  ])
  @ApiResponse({ status: 200, description: 'Engagement approval decision processed' })
  @ApiResponse({ status: 400, description: 'Engagement must be in VERIFIED status' })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePartnershipEngagementDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.partnershipEngagementService.approve(id, dto, request.user.sub);
  }

  @Get('paginated')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_ENGAGEMENT, actions: [ACTIONS.READ] },
  ])
  @ApiResponse({ status: 200, description: 'Paginated engagements list' })
  findAll(@Query() query: SearchPartnershipEngagementDto) {
    return this.partnershipEngagementService.findAll(query);
  }

  @Get(':id')
  @Resource([
    { resource: RESOURCE.PARTNERSHIP_ENGAGEMENT, actions: [ACTIONS.READ_ONE] },
  ])
  @ApiResponse({ status: 200, description: 'Engagement details' })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  findOne(@Param('id') id: string) {
    return this.partnershipEngagementService.findOne(id);
  }
}
