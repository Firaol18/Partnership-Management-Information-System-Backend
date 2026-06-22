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
import { EventAndVisitService } from './event-and-visit.service';
import {
  CreateEventAndVisitDto,
  UpdateEventAndVisitDto,
  VerifyEventAndVisitDto,
  ApproveEventAndVisitDto,
  AssignEmployeeDto,
  SearchEventAndVisitDto,
} from './dto';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Resource } from '../../common/decorators/resource.decorator';
import { RESOURCE } from '../../common/constants/resource';
import { ACTIONS } from '../../common/constants/actions';
import { EmployeeTokenClaim } from '../../common/interfaces/employee-login.interface';

@ApiTags('Event and Visit')
@ApiBearerAuth()
@Controller('event-and-visit')
export class EventAndVisitController {
  constructor(private readonly eventAndVisitService: EventAndVisitService) {}

  @Post()
  @Resource([{ resource: RESOURCE.EVENT_AND_VISIT, actions: [ACTIONS.CREATE] }])
  @ApiResponse({ status: 201, description: 'Event or Visit created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  create(
    @Body() createDto: CreateEventAndVisitDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.eventAndVisitService.create(createDto, request.user.sub);
  }

  @Get('paginated')
  @Resource([{ resource: RESOURCE.EVENT_AND_VISIT, actions: [ACTIONS.READ] }])
  @ApiResponse({ status: 200, description: 'Paginated list retrieved successfully' })
  findAllPaginated(@Query() query: SearchEventAndVisitDto) {
    return this.eventAndVisitService.findAllPaginated(query);
  }

  @Get(':id')
  @Resource([{ resource: RESOURCE.EVENT_AND_VISIT, actions: [ACTIONS.READ_ONE] }])
  @ApiResponse({ status: 200, description: 'Record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  findOne(@Param('id') id: string) {
    return this.eventAndVisitService.findOne(id);
  }

  @Patch(':id')
  @Resource([{ resource: RESOURCE.EVENT_AND_VISIT, actions: [ACTIONS.UPDATE] }])
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - e.g. already verified or approved' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the creator' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEventAndVisitDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.eventAndVisitService.update(id, updateDto, request.user.sub);
  }

  @Delete(':id')
  @Resource([{ resource: RESOURCE.EVENT_AND_VISIT, actions: [ACTIONS.DELETE] }])
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - e.g. already verified or approved' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the creator' })
  remove(@Param('id') id: string, @Request() request: EmployeeTokenClaim) {
    return this.eventAndVisitService.remove(id, request.user.sub);
  }

  @Post(':id/verify')
  @Resource([{ resource: RESOURCE.EVENT_AND_VISIT, actions: [ACTIONS.VERIFY] }])
  @ApiResponse({ status: 200, description: 'Record verified successfully' })
  verify(
    @Param('id') id: string,
    @Body() verifyDto: VerifyEventAndVisitDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.eventAndVisitService.verify(id, verifyDto, request.user.sub);
  }

  @Post(':id/approve')
  @Resource([{ resource: RESOURCE.EVENT_AND_VISIT, actions: [ACTIONS.APPROVE] }])
  @ApiResponse({ status: 200, description: 'Record approved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - e.g. not verified yet' })
  approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveEventAndVisitDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.eventAndVisitService.approve(id, approveDto, request.user.sub);
  }

  @Post(':id/assign')
  @Resource([{ resource: RESOURCE.EVENT_AND_VISIT, actions: [ACTIONS.UPDATE] }])
  @ApiResponse({ status: 200, description: 'Employee assigned successfully' })
  @ApiResponse({ status: 444, description: 'Assigned employee not found' })
  assign(@Param('id') id: string, @Body() assignDto: AssignEmployeeDto) {
    return this.eventAndVisitService.assign(id, assignDto);
  }
}
