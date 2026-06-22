import { Controller, Get, Post, Body, Param, Delete, Patch, Query } from '@nestjs/common';
import { PermissionActionService } from './permission-action.service';
import { CreatePermissionActionDto, SearchPermissionActionDto } from './dto/create-permission-action.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../../common/decorators/resource.decorator';
import { RESOURCE } from '../../../common/constants/resource';
import { ACTIONS } from '../../../common/constants/actions';

@ApiTags('permission-action')
@Controller('permission-action')
@ApiBearerAuth()
export class PermissionActionController {
  constructor(private readonly service: PermissionActionService) {}

  @Post()
  @Resource([{ resource: RESOURCE.PERMISSION_ACTION, actions: [ACTIONS.CREATE] }])
  create(@Body() dto: CreatePermissionActionDto) {
    return this.service.create(dto);
  }

  @Get()
  @Resource([{ resource: RESOURCE.PERMISSION_ACTION, actions: [ACTIONS.READ] }])
  findAll() {
    return this.service.findAll();
  }

  @Get('paginated')
  @Resource([{ resource: RESOURCE.PERMISSION_ACTION, actions: [ACTIONS.READ] }])
  findAllPaginated(@Query() query: SearchPermissionActionDto) {
    return this.service.findAllPaginated(query);
  }

  @Get(':id')
  @Resource([{ resource: RESOURCE.PERMISSION_ACTION, actions: [ACTIONS.READ_ONE] }])
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Resource([{ resource: RESOURCE.PERMISSION_ACTION, actions: [ACTIONS.UPDATE] }])
  update(@Param('id') id: string, @Body() dto: Partial<CreatePermissionActionDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Resource([{ resource: RESOURCE.PERMISSION_ACTION, actions: [ACTIONS.DELETE] }])
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
