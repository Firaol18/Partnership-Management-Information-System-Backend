import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuthorizationService } from '../../common/services/authorization.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
  SearchEmployeeDto,
  PublicEmployeeProfileDto,
} from './dto';
import { EmployeeTokenClaim } from '../../common/interfaces/employee-login.interface';
import * as bcrypt from 'bcryptjs';
import { plainToInstance } from 'class-transformer';
import { paginate } from '../../common/utils/paginater';
import {
  ChangeEmployeePasswordDto,
  ChangeOtherEmployeePasswordDto,
} from './dto/change-employee-password.dto';
import { SmsService } from '../../common/services/sms.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ActivateEmployeeDto,
  DeactivateEmployeeDto,
} from './dto/employee-activation.dto';
import { RESOURCE } from '../../common/constants/resource';
import { ACTIONS } from '../../common/constants/actions';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly authorizationService: AuthorizationService,
    private readonly smsService: SmsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    createEmployeeDto: CreateEmployeeDto,
    currentEmployee: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto> {
    // Check if username already exists
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { username: createEmployeeDto.username },
    });

    if (existingEmployee) {
      throw new ConflictException('Username already exists');
    }

    // Check if phone number already exists
    const existingPhone = await this.prisma.employee.findUnique({
      where: { phone_number: createEmployeeDto.phone_number },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Check if email already exists (if provided)
    if (createEmployeeDto.email) {
      const existingEmail = await this.prisma.employee.findUnique({
        where: { email: createEmployeeDto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createEmployeeDto.password, 10);

    // Create employee
    const {
      role_id,
      group_id,
      is_supervisor,
      ...employeeData
    } = createEmployeeDto;

    const employee = await this.prisma.employee.create({
      data: {
        ...employeeData,
        password: hashedPassword,
        require_password_change: true,
        created_by_id: currentEmployee.user.sub,
        ...(group_id && {
          group: {
            connect: { id: group_id },
          },
        }),
        ...(typeof is_supervisor === 'boolean' && { is_supervisor }),
      },
      include: {
        employeeRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Create employee role if role_id is provided
    if (role_id) {
      await this.prisma.employeeRole.create({
        data: {
          employee_id: employee.id,
          role_id: role_id,
        },
      });
    }

    // Fetch the employee with roles to return complete data
    const employeeWithRoles = await this.prisma.employee.findUnique({
      where: { id: employee.id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        employeeRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return plainToInstance(EmployeeResponseDto, employeeWithRoles, {
      groups: ['me'],
    });
  }

  async findAll(
    currentEmployee: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto[]> {
    const employees = await this.prisma.employee.findMany({
      omit: { password: true, code_hash: true },
      include: {
        employeeRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return plainToInstance(EmployeeResponseDto, employees, {
      groups: ['me'],
    });
  }

  async findAllPaginated(options: SearchEmployeeDto) {
    const {
      search,
      group_id,
      role_id,
      is_supervisor,
      is_active,
      is_suspended,
    } = { ...options };
    const where: any = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        { username: search },
        { phone_number: search },
      ];
    }

    if (group_id) {
      where.group_id = group_id;
    }

    if (role_id) {
      where.employeeRoles = { some: { role_id: role_id } };
    }

    if (is_supervisor) {
      where.is_supervisor = is_supervisor === 'true';
    }

    if (is_active) {
      where.is_active = is_active === 'true';
    }

    if (is_suspended) {
      where.is_suspended = is_suspended === 'true';
    }

    return await paginate(
      this.prisma.employee,
      {
        where,
        orderBy: { created_at: 'desc' },
        omit: { password: true, code_hash: true },
        include: {
          group: { select: { id: true, name: true } },
          employeeRoles: {
            select: {
              id: true,
              role: { select: { id: true, name: true } },
            },
          },
        },
      },
      { page: options.page, perPage: options.limit },
    );
  }

  async findOne(
    id: string,
    currentEmployee: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      omit: { password: true },
      include: {
        employeeRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return plainToInstance(
      EmployeeResponseDto,
      employee,
      {
        groups: ['me'],
      },
    );
  }

  async findOnePublic(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone_number: true,
        group: {
          select: {
            name: true,
          },
        },
      },
    });

    return employee;
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    currentEmployee: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto> {
    // Check if employee exists
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      throw new NotFoundException('Employee not found');
    }

    // Check for unique constraints if updating username, phone, or email
    if (updateEmployeeDto.username) {
      const existingUsername = await this.prisma.employee.findFirst({
        where: {
          username: updateEmployeeDto.username,
          id: { not: id },
        },
      });

      if (existingUsername) {
        throw new ConflictException('Username already exists');
      }
    }

    if (updateEmployeeDto.phone_number) {
      const existingPhone = await this.prisma.employee.findFirst({
        where: {
          phone_number: updateEmployeeDto.phone_number,
          id: { not: id },
        },
      });

      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    if (updateEmployeeDto.email) {
      const existingEmail = await this.prisma.employee.findFirst({
        where: {
          email: updateEmployeeDto.email,
          id: { not: id },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (updateEmployeeDto.password) {
      hashedPassword = await bcrypt.hash(updateEmployeeDto.password, 10);
    }

    // Prepare update data
    const updateData: any = { ...updateEmployeeDto };
    if (hashedPassword) {
      updateData.password = hashedPassword;
    }
    delete updateData.password; // Remove the plain password

    updateData.updated_by_id = currentEmployee.user.sub;

    // Handle group relation connect/disconnect explicitly if provided
    if (Object.prototype.hasOwnProperty.call(updateEmployeeDto, 'group_id')) {
      const groupId = (updateEmployeeDto as any).group_id;
      if (groupId) {
        updateData.group = { connect: { id: groupId } };
      } else {
        updateData.group = { disconnect: true };
      }
      delete updateData.group_id;
    }

    // Update employee
    const employee = await this.prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        employeeRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return plainToInstance(EmployeeResponseDto, employee, {
      groups: ['me'],
    });
  }

  async remove(id: string, currentEmployee: EmployeeTokenClaim): Promise<void> {
    // Check if employee exists
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      throw new NotFoundException('Employee not found');
    }

    // Prevent self-deletion
    if (id === currentEmployee.user.sub) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    await this.prisma.employee.delete({
      where: { id },
    });
  }

  async changePassword(
    changeEmployeePassword: ChangeEmployeePasswordDto,
    currentEmployee: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto> {
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { id: currentEmployee.user.sub },
      select: { id: true, password: true },
    });

    const isPasswordValid = await bcrypt.compare(
      changeEmployeePassword.old_password,
      existingEmployee.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    let hashedPassword = await bcrypt.hash(changeEmployeePassword.password, 10);

    const employee = await this.prisma.employee.update({
      where: { id: currentEmployee.user.sub },
      data: { password: hashedPassword },
      include: {
        employeeRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return plainToInstance(EmployeeResponseDto, employee, {
      groups: ['me'],
    });
  }

  async changeOtherEmployeePassword(
    changeEmployeePassword: ChangeOtherEmployeePasswordDto,
  ): Promise<EmployeeResponseDto> {
    let hashedPassword = await bcrypt.hash(changeEmployeePassword.password, 10);

    const employee = await this.prisma.employee.update({
      where: { id: changeEmployeePassword.employee_id },
      data: { password: hashedPassword, require_password_change: true },
      include: {
        employeeRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    try {
      const smsMessage = `Your password has been changed. If you did not request this change, please contact your administrator immediately.`;
      await this.smsService.sendSms(employee.phone_number, smsMessage);
    } catch (error) {
      console.error('Failed to send password change SMS:', error);
    }

    try {
      this.notificationsService.createForEmployee(
        changeEmployeePassword.employee_id,
        'PASSWORD_CHANGED',
        {
          title: 'Password Changed by Administrator',
          body: 'Your password has been changed by an administrator. If you did not request this change, please contact your administrator immediately.',
          priority: 'high',
          data: {
            timestamp: new Date().toISOString(),
            changedBy: 'administrator',
          },
        },
      );
    } catch (error) {
      console.error('Failed to send password change notification:', error);
    }

    return plainToInstance(EmployeeResponseDto, employee, {
      groups: ['me'],
    });
  }

  async findPublicProfileById(id: string): Promise<PublicEmployeeProfileDto> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        profile_image: true,
        employeeRoles: {
          select: {
            id: true,
            created_at: true,
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async activateEmployee(
    id: string,
    dto: ActivateEmployeeDto,
    request: EmployeeTokenClaim,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { is_active: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (employee.is_active) {
      throw new BadRequestException('Employee is already active');
    }
    await this.prisma.employee.update({
      where: { id },
      data: {
        is_active: true,
        active_status_updated_at: new Date(),
        active_status_updated_by_id: request.user.sub,
        status_update_note: dto.reason,
      },
    });

    return { message: 'Employee activated successfully' };
  }

  async deactivateEmployee(
    id: string,
    dto: DeactivateEmployeeDto,
    request: EmployeeTokenClaim,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { is_active: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (!employee.is_active) {
      throw new BadRequestException('Employee is already deactivated');
    }

    const isAdmin = await this.authorizationService.hasPermission(
      id,
      RESOURCE.EMPLOYEE,
      ACTIONS.CREATE,
      true, // isEmployee
    );

    if (isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to deactivate this employee',
      );
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        is_active: false,
        active_status_updated_at: new Date(),
        active_status_updated_by_id: request.user.sub,
        status_update_note: dto.reason,
      },
    });
    return { message: 'Employee deactivated successfully' };
  }
}
