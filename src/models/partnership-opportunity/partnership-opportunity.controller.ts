import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { PartnershipOpportunityService } from './partnership-opportunity.service';
import {
  CreatePartnershipOpportunityDto,
  UpdatePartnershipOpportunityDto,
  ScreenOpportunityDto,
  VerifyOpportunityDto,
  ForwardOpportunityDto,
  ReviewOpportunityDto,
  ApproveOpportunityDto,
  SearchPartnershipOpportunityDto,
} from './dto';
import { Resource } from '../../common/decorators/resource.decorator';
import { RESOURCE } from '../../common/constants/resource';
import { ACTIONS } from '../../common/constants/actions';
import { EmployeeTokenClaim } from '../../common/interfaces/employee-login.interface';

@ApiTags('Partnership Opportunity')
@ApiBearerAuth()
@Controller('partnership-opportunity')
export class PartnershipOpportunityController {
  constructor(private readonly service: PartnershipOpportunityService) {}

  // ─── Officer: Create ────────────────────────────────────────────────────────

  @Post()
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.CREATE] }])
  @ApiResponse({ status: 201, description: 'Opportunity created successfully' })
  create(
    @Body() dto: CreatePartnershipOpportunityDto,
    @Request() req: EmployeeTokenClaim,
  ) {
    return this.service.create(dto, req.user.sub);
  }

  // ─── List (paginated) ────────────────────────────────────────────────────────

  @Get('paginated')
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.READ] }])
  @ApiResponse({ status: 200, description: 'Paginated list of opportunities' })
  findAllPaginated(@Query() query: SearchPartnershipOpportunityDto) {
    return this.service.findAllPaginated(query);
  }

  // ─── Get one ────────────────────────────────────────────────────────────────

  @Get(':id')
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.READ_ONE] }])
  @ApiResponse({ status: 200, description: 'Opportunity retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ─── Officer: Update (pre-screening only) ───────────────────────────────────

  @Patch(':id')
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.UPDATE] }])
  @ApiResponse({ status: 200, description: 'Opportunity updated' })
  @ApiResponse({ status: 400, description: 'Already screened — cannot modify' })
  @ApiResponse({ status: 403, description: 'Only creator can update' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePartnershipOpportunityDto,
    @Request() req: EmployeeTokenClaim,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  // ─── Officer: Delete (pre-screening only) ───────────────────────────────────

  @Delete(':id')
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.DELETE] }])
  @ApiResponse({ status: 200, description: 'Opportunity deleted' })
  @ApiResponse({ status: 400, description: 'Already screened — cannot delete' })
  @ApiResponse({ status: 403, description: 'Only creator can delete' })
  remove(@Param('id') id: string, @Request() req: EmployeeTokenClaim) {
    return this.service.remove(id, req.user.sub);
  }

  // ─── K&E Director: Stage 1 — Screen ─────────────────────────────────────────

  @Post(':id/screen')
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.CHECK] }])
  @ApiResponse({ status: 200, description: 'Opportunity screened (SCREENED or REJECTED)' })
  screen(
    @Param('id') id: string,
    @Body() dto: ScreenOpportunityDto,
    @Request() req: EmployeeTokenClaim,
  ) {
    return this.service.screen(id, dto, req.user.sub);
  }

  // ─── K&E Director: Stage 2 — Verify ─────────────────────────────────────────

  @Post(':id/verify')
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.VERIFY] }])
  @ApiResponse({ status: 200, description: 'Opportunity verified (VERIFIED or REJECTED)' })
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyOpportunityDto,
    @Request() req: EmployeeTokenClaim,
  ) {
    return this.service.verify(id, dto, req.user.sub);
  }

  // ─── K&E Director: Stage 3 — Forward to Division ────────────────────────────

  @Post(':id/forward')
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.DISPATCH] }])
  @ApiResponse({ status: 200, description: 'Opportunity forwarded to division' })
  @ApiResponse({ status: 400, description: 'Not yet verified' })
  @ApiResponse({ status: 404, description: 'Division not found' })
  forward(
    @Param('id') id: string,
    @Body() dto: ForwardOpportunityDto,
    @Request() req: EmployeeTokenClaim,
  ) {
    return this.service.forward(id, dto, req.user.sub);
  }

  // ─── Division Director: Stage 4 — Review ────────────────────────────────────

  @Post(':id/review')
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.VALIDATE] }])
  @ApiResponse({ status: 200, description: 'Opportunity reviewed (REVIEWED or REJECTED)' })
  @ApiResponse({ status: 400, description: 'Not yet forwarded to division' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewOpportunityDto,
    @Request() req: EmployeeTokenClaim,
  ) {
    return this.service.review(id, dto, req.user.sub);
  }

  // ─── Division Director: Stage 5 — Approve ────────────────────────────────────

  @Post(':id/approve')
  @Resource([{ resource: RESOURCE.PARTNERSHIP_OPPORTUNITY, actions: [ACTIONS.APPROVE] }])
  @ApiResponse({ status: 200, description: 'APPROVED → transferred to waiting list. REJECTED → with reason.' })
  @ApiResponse({ status: 400, description: 'Not yet reviewed' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveOpportunityDto,
    @Request() req: EmployeeTokenClaim,
  ) {
    return this.service.approve(id, dto, req.user.sub);
  }
}
