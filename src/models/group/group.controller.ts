import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { GroupService } from './group.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  SearchGroupDto,
} from './dto';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Resource } from '../../common/decorators/resource.decorator';
import { RESOURCE } from '../../common/constants/resource';
import { ACTIONS } from '../../common/constants/actions';
import { EmployeeTokenClaim } from '../../common/interfaces/employee-login.interface';

@ApiTags('Group')
@ApiBearerAuth()
@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Resource([{ resource: RESOURCE.GROUP, actions: [ACTIONS.CREATE] }])
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 400, description: 'Group name must be unique' })
  @ApiResponse({ status: 404, description: 'Parent group not found' })
  create(
    @Body() dto: CreateGroupDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.groupService.create(dto, request.user.sub);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Resource([{ resource: RESOURCE.GROUP, actions: [ACTIONS.UPDATE] }])
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Circular reference or duplicate name error',
  })
  @ApiResponse({ status: 404, description: 'Group or parent group not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.groupService.update(id, dto, request.user.sub);
  }

  // ─── Tree Structure ───────────────────────────────────────────────────────

  @Get('tree')
  @Resource([{ resource: RESOURCE.GROUP, actions: [ACTIONS.READ] }])
  @ApiResponse({ status: 200, description: 'Hierarchical tree of all groups' })
  getTree() {
    return this.groupService.getTree();
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  @Get('paginated')
  @Resource([{ resource: RESOURCE.GROUP, actions: [ACTIONS.READ] }])
  @ApiResponse({ status: 200, description: 'Paginated list of groups' })
  findAll(@Query() query: SearchGroupDto) {
    return this.groupService.findAll(query);
  }

  @Get(':id')
  @Resource([{ resource: RESOURCE.GROUP, actions: [ACTIONS.READ_ONE] }])
  @ApiResponse({ status: 200, description: 'Group details' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(id);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @Delete(':id')
  @Resource([{ resource: RESOURCE.GROUP, actions: [ACTIONS.DELETE] }])
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete group with child groups or assigned employees/opportunities/agreements',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  remove(@Param('id') id: string) {
    return this.groupService.remove(id);
  }
}
