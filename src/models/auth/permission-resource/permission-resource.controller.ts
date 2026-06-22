import { Controller, Get, Post, Body, Param, Delete, Patch, Query } from '@nestjs/common';
import { PermissionResourceService } from './permission-resource.service';
import { CreatePermissionResourceDto, SearchPermissionResourceDto } from './dto/create-permission-resource.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../../common/decorators/resource.decorator';
import { RESOURCE } from '../../../common/constants/resource';
import { ACTIONS } from '../../../common/constants/actions';

@ApiTags('permission-resource')
@Controller('permission-resource')
@ApiBearerAuth()
export class PermissionResourceController {
  constructor(private readonly service: PermissionResourceService) {}

  @Post()
  @Resource([{ resource: RESOURCE.PERMISSION_RESOURCE, actions: [ACTIONS.CREATE] }])
  create(@Body() dto: CreatePermissionResourceDto) {
    return this.service.create(dto);
  }

  @Get()
  @Resource([{ resource: RESOURCE.PERMISSION_RESOURCE, actions: [ACTIONS.READ] }])
  findAll() {
    return this.service.findAll();
  }

  @Get('paginated')
  @Resource([{ resource: RESOURCE.PERMISSION_RESOURCE, actions: [ACTIONS.READ] }])
  findAllPaginated(@Query() query: SearchPermissionResourceDto) {
    return this.service.findAllPaginated(query);
  }

  @Get(':id')
  @Resource([{ resource: RESOURCE.PERMISSION_RESOURCE, actions: [ACTIONS.READ_ONE] }])
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Resource([{ resource: RESOURCE.PERMISSION_RESOURCE, actions: [ACTIONS.UPDATE] }])
  update(@Param('id') id: string, @Body() dto: Partial<CreatePermissionResourceDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Resource([{ resource: RESOURCE.PERMISSION_RESOURCE, actions: [ACTIONS.DELETE] }])
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
