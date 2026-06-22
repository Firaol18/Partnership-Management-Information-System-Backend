import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { EmployeeService } from './employee.service';

@ApiTags('Public Employee')
@Controller('public/employee')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PublicEmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get(':id')
  findPublicProfileById(@Param('id') id: string) {
    return this.employeeService.findPublicProfileById(id);
  }
}
