import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  IUserRole,
  AuthPermission,
} from '../interfaces/employee-login.interface';

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async getUserRoles(userId: string): Promise<IUserRole[]> {
    try {
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  rolePermissionResources: {
                    select: {
                      rolePermissionResourceActions: {
                        select: {
                          permissionAction: {
                            select: { id: true, action: true },
                          },
                        },
                      },
                      permissionResource: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      return userWithRoles?.userRoles || [];
    } catch (error) {
      this.logger.error(`Failed to get user roles for user ${userId}:`, error);
      return [];
    }
  }

  async getEmployeeRoles(employeeId: string): Promise<IUserRole[]> {
    try {
      const employeeWithRoles = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          employeeRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  rolePermissionResources: {
                    select: {
                      rolePermissionResourceActions: {
                        select: {
                          permissionAction: {
                            select: { id: true, action: true },
                          },
                        },
                      },
                      permissionResource: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      return employeeWithRoles?.employeeRoles || [];
    } catch (error) {
      this.logger.error(
        `Failed to get employee roles for employee ${employeeId}:`,
        error,
      );
      return [];
    }
  }

  async getEmployeePermissions(employeeId: string): Promise<AuthPermission[]> {
    try {
      const rolePermissionResources =
        await this.prisma.rolePermissionResource.findMany({
          where: {
            role: { employeeRoles: { some: { employee_id: employeeId } } },
          },
          select: {
            rolePermissionResourceActions: {
              select: {
                permissionAction: {
                  select: { id: true, action: true },
                },
              },
            },
            permissionResource: {
              select: { name: true },
            },
          },
        });

      return rolePermissionResources.map((rolePermissionResource) => ({
        resource: rolePermissionResource.permissionResource.name,
        permissions: rolePermissionResource.rolePermissionResourceActions.map(
          (rolePermissionResourceAction) =>
            rolePermissionResourceAction.permissionAction.action,
        ),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get employee permissions for employee ${employeeId}:`,
        error,
      );
      return [];
    }
  }

  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    isEmployee: boolean = false,
  ): Promise<boolean> {
    try {
      const roles = isEmployee
        ? await this.getEmployeeRoles(userId)
        : await this.getUserRoles(userId);

      return roles.some((userRole) =>
        userRole.role.rolePermissionResources.some(
          (rolePermissionResource) =>
            rolePermissionResource.permissionResource.name.toLowerCase() ===
              resource.toLowerCase() &&
            rolePermissionResource.rolePermissionResourceActions.some(
              (rolePermissionResourceAction) =>
                rolePermissionResourceAction.permissionAction.action.toLowerCase() ===
                action.toLowerCase(),
            ),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to check permission for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  async hasAnyPermission(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
    isEmployee: boolean = false,
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (
        await this.hasPermission(
          userId,
          permission.resource,
          permission.action,
          isEmployee,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  async hasAllPermissions(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
    isEmployee: boolean = false,
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (
        !(await this.hasPermission(
          userId,
          permission.resource,
          permission.action,
          isEmployee,
        ))
      ) {
        return false;
      }
    }
    return true;
  }
}
