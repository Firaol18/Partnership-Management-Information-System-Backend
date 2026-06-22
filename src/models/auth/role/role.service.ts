import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRoleDto, SearchRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DatabaseService } from '../../../common/database/database.service';
import { paginate } from '../../../common/utils/paginater';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(data: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        switchable: data.switchable,
        editable: data.editable,
      },
    });

    for (const _rpr of data.rolePermissionResources) {
      const rpr = await this.prisma.rolePermissionResource.create({
        data: { role_id: role.id, permission_resource_id: _rpr.permission_resource_id },
      });
      for (const _action of _rpr.rolePermissionResourceActions) {
        await this.prisma.rolePermissionResourceAction.create({
          data: { role_permission_resource_id: rpr.id, permission_action_id: _action.permission_action_id },
        });
      }
    }

    return role;
  }

  async findAllPaginated(options: SearchRoleDto) {
    const { search } = options;
    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    return await paginate(this.prisma.role, { where }, { page: +options.page, perPage: +options.limit });
  }

  findAll() {
    return this.prisma.role.findMany();
  }

  findOne(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissionResources: {
          select: {
            id: true,
            permissionResource: { select: { id: true, name: true } },
            rolePermissionResourceActions: {
              select: {
                id: true,
                permissionAction: { select: { id: true, action: true } },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    await this.prisma.role.update({
      where: { id },
      data: { name: data.name, description: data.description, switchable: data.switchable, editable: data.editable },
    });

    await this.prisma.rolePermissionResourceAction.deleteMany({
      where: { rolePermissionResource: { role_id: id } },
    });
    await this.prisma.rolePermissionResource.deleteMany({ where: { role_id: id } });

    for (const rpr of data.rolePermissionResources ?? []) {
      const created = await this.prisma.rolePermissionResource.create({
        data: { role_id: role.id, permission_resource_id: rpr.permission_resource_id },
      });
      if (rpr.rolePermissionResourceActions?.length > 0) {
        await this.prisma.rolePermissionResourceAction.createMany({
          data: rpr.rolePermissionResourceActions.map((a) => ({
            role_permission_resource_id: created.id,
            permission_action_id: a.permission_action_id,
          })),
        });
      }
    }

    return role;
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: { id: true, userRoles: { take: 1 } },
    });

    if (role.userRoles.length) {
      throw new BadRequestException('Failed to delete record, Associated users exist!');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermissionResourceAction.deleteMany({
        where: { rolePermissionResource: { role_id: id } },
      });
      await tx.rolePermissionResource.deleteMany({ where: { role_id: id } });
      return tx.role.delete({ where: { id } });
    });
  }
}
