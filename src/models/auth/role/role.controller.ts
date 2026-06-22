import { Controller, Get, Post, Body, Param, Delete, HttpException, Patch, Query } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto, SearchRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../../common/decorators/resource.decorator';
import { RESOURCE } from '../../../common/constants/resource';
import { ACTIONS } from '../../../common/constants/actions';
import { DatabaseService } from '../../../common/database/database.service';

@ApiTags('role')
@Controller('role')
@ApiBearerAuth()
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly prisma: DatabaseService,
  ) {}

  @Post()
  @Resource([{ resource: RESOURCE.ROLE, actions: [ACTIONS.CREATE] }])
  async create(@Body() createRoleDto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({ where: { name: createRoleDto.name } });
    if (existing) throw new HttpException('Record already exists', 422);
    return this.roleService.create(createRoleDto);
  }

  @Get('paginated')
  @Resource([{ resource: RESOURCE.ROLE, actions: [ACTIONS.READ] }])
  findAllPaginated(@Query() payload: SearchRoleDto) {
    return this.roleService.findAllPaginated(payload);
  }

  @Get()
  @Resource([{ resource: RESOURCE.ROLE, actions: [ACTIONS.READ] }])
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @Resource([{ resource: RESOURCE.ROLE, actions: [ACTIONS.READ_ONE] }])
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @Resource([{ resource: RESOURCE.ROLE, actions: [ACTIONS.UPDATE] }])
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Resource([{ resource: RESOURCE.ROLE, actions: [ACTIONS.DELETE] }])
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }
}
