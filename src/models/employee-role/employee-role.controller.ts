import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmployeeRoleService } from './employee-role.service';
import { Resource } from '../../common/decorators/resource.decorator';
import { RESOURCE } from '../../common/constants/resource';
import { ACTIONS } from '../../common/constants/actions';
import { CreateEmployeeRoleDto } from './dto';

@ApiTags('employee-role')
@Controller('employee-role')
@ApiBearerAuth()
export class EmployeeRoleController {
  constructor(private readonly employeeRoleService: EmployeeRoleService) {}

  @Post('')
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.CREATE] }])
  create(@Body() createEmployeeRoleDto: CreateEmployeeRoleDto) {
    return this.employeeRoleService.create(createEmployeeRoleDto);
  }

  @Get(':id')
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.READ] }])
  findOne(@Param('id') id: string) {
    return this.employeeRoleService.findOne(id);
  }

  @Delete(':id')
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.DELETE] }])
  remove(@Param('id') id: string) {
    return this.employeeRoleService.remove(id);
  }
}
