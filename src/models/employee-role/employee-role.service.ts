import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { CreateEmployeeRoleDto } from './dto';

@Injectable()
export class EmployeeRoleService {
  constructor(private readonly prisma: DatabaseService) {}

  async create({ role_id, employee_id }: CreateEmployeeRoleDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employee_id },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const role = await this.prisma.role.findUnique({ where: { id: role_id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const existingEmployeeRole = await this.prisma.employeeRole.findFirst({
      where: { role_id, employee_id },
    });

    if (existingEmployeeRole) {
      throw new BadRequestException('Employee role already exists');
    }
    return this.prisma.employeeRole.create({
      data: {
        employee_id,
        role_id,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.employeeRole.findUnique({ where: { id } });
  }

  remove(id: string) {
    return this.prisma.employeeRole.delete({ where: { id } });
  }
}
