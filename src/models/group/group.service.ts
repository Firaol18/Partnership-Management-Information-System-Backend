import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../common/database/database.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  SearchGroupDto,
} from './dto';
import { paginate } from '../../common/utils/paginater';
import { Prisma } from '@prisma/client';

@Injectable()
export class GroupService {
  constructor(private readonly prisma: DatabaseService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateGroupDto, employeeId: string) {
    // Check if name is unique
    const existing = await this.prisma.group.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Group with name "${dto.name}" already exists`);
    }

    const groupId = randomUUID();
    let path = `/${groupId}`;

    // Verify parent group if provided
    if (dto.parent_group_id) {
      const parent = await this.prisma.group.findUnique({
        where: { id: dto.parent_group_id },
      });
      if (!parent) {
        throw new NotFoundException('Parent group not found');
      }
      path = `${parent.path}/${groupId}`;
    }

    const isDraft = dto.draft ?? false;

    return this.prisma.group.create({
      data: {
        id: groupId,
        name: dto.name,
        description: dto.description || null,
        parent_group_id: dto.parent_group_id || null,
        path,
        draft: isDraft,
        drafted_at: isDraft ? new Date() : null,
        drafted_by_id: isDraft ? employeeId : null,
      },
      include: {
        parent: true,
      },
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateGroupDto, employeeId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check name uniqueness if updated
    if (dto.name && dto.name !== group.name) {
      const existing = await this.prisma.group.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException(`Group with name "${dto.name}" already exists`);
      }
    }

    let parentGroupId: string | null | undefined = dto.parent_group_id;
    let newPath = group.path;
    let pathChanged = false;

    // Handle hierarchy update
    if (parentGroupId !== undefined && parentGroupId !== group.parent_group_id) {
      pathChanged = true;
      if (parentGroupId === id) {
        throw new BadRequestException('A group cannot be its own parent');
      }

      if (parentGroupId !== null) {
        const parent = await this.prisma.group.findUnique({
          where: { id: parentGroupId },
        });
        if (!parent) {
          throw new NotFoundException('Parent group not found');
        }

        // Check for circular reference: parent cannot be a descendant of the group
        if (parent.path && parent.path.startsWith(`${group.path}/`)) {
          throw new BadRequestException('A group cannot inherit from its own descendant');
        }

        newPath = `${parent.path}/${id}`;
      } else {
        newPath = `/${id}`;
      }
    }

    // Determine draft status and audit fields
    let draftStatus = group.draft;
    let draftedAt = group.drafted_at;
    let draftedById = group.drafted_by_id;

    if (dto.draft !== undefined) {
      draftStatus = dto.draft;
      if (dto.draft && !group.draft) {
        draftedAt = new Date();
        draftedById = employeeId;
      } else if (!dto.draft) {
        draftedAt = null;
        draftedById = null;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // If path changed, recursively update all descendant paths
      if (pathChanged && group.path) {
        const descendants = await tx.group.findMany({
          where: {
            path: {
              startsWith: `${group.path}/`,
            },
          },
        });

        for (const desc of descendants) {
          if (desc.path) {
            const updatedDescPath = desc.path.replace(group.path, newPath);
            await tx.group.update({
              where: { id: desc.id },
              data: { path: updatedDescPath },
            });
          }
        }
      }

      // Update the target group
      return tx.group.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(parentGroupId !== undefined && { parent_group_id: parentGroupId }),
          path: newPath,
          draft: draftStatus,
          drafted_at: draftedAt,
          drafted_by_id: draftedById,
        },
        include: {
          parent: true,
        },
      });
    });
  }

  // ─── Find One ─────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: { name: 'asc' },
        },
        employees: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            opportunities: true,
            agreements: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  // ─── Find All ─────────────────────────────────────────────────────────────

  async findAll(query: SearchGroupDto) {
    const where: Prisma.GroupWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.parent_group_id !== undefined) {
      where.parent_group_id = query.parent_group_id;
    }

    if (query.draft !== undefined) {
      where.draft = query.draft;
    }

    return paginate(
      this.prisma.group,
      {
        where,
        orderBy: { created_at: 'desc' },
        include: {
          parent: true,
        },
      },
      { page: query.page, perPage: query.limit },
    );
  }

  // ─── Get Tree ─────────────────────────────────────────────────────────────

  async getTree() {
    const allGroups = await this.prisma.group.findMany({
      orderBy: { name: 'asc' },
    });

    const map = new Map<string, any>();
    const roots: any[] = [];

    // Create list of group tree node representations
    for (const group of allGroups) {
      map.set(group.id, {
        id: group.id,
        name: group.name,
        description: group.description,
        parent_group_id: group.parent_group_id,
        path: group.path,
        draft: group.draft,
        drafted_at: group.drafted_at,
        drafted_by_id: group.drafted_by_id,
        created_at: group.created_at,
        updated_at: group.updated_at,
        children: [],
      });
    }

    // Assemble children lists
    for (const group of allGroups) {
      const node = map.get(group.id);
      if (group.parent_group_id && map.has(group.parent_group_id)) {
        const parentNode = map.get(group.parent_group_id);
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if it has child groups
    const subGroupsCount = await this.prisma.group.count({
      where: { parent_group_id: id },
    });
    if (subGroupsCount > 0) {
      throw new BadRequestException(
        'Cannot delete group because it has sub-groups (children)',
      );
    }

    // Check for assigned employees
    const employeesCount = await this.prisma.employee.count({
      where: { group_id: id },
    });
    if (employeesCount > 0) {
      throw new BadRequestException(
        'Cannot delete group because it has assigned employees',
      );
    }

    // Check for linked partnership opportunities
    const opportunitiesCount = await this.prisma.partnershipOpportunity.count({
      where: { forwarded_to_division_id: id },
    });
    if (opportunitiesCount > 0) {
      throw new BadRequestException(
        'Cannot delete group because it has linked partnership opportunities',
      );
    }

    // Check for linked partnership agreements
    const agreementsCount = await this.prisma.partnershipAgreement.count({
      where: { eaii_responsible_division_id: id },
    });
    if (agreementsCount > 0) {
      throw new BadRequestException(
        'Cannot delete group because it has linked partnership agreements',
      );
    }

    return this.prisma.group.delete({
      where: { id },
    });
  }
}
