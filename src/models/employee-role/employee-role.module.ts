import { Module } from '@nestjs/common';
import { EmployeeRoleService } from './employee-role.service';
import { EmployeeRoleController } from './employee-role.controller';

@Module({
  controllers: [EmployeeRoleController],
  providers: [EmployeeRoleService],
})
export class EmployeeRoleModule {}
