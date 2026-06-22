import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { CreatePermissionActionDto, SearchPermissionActionDto } from './dto/create-permission-action.dto';
import { paginate } from '../../../common/utils/paginater';

@Injectable()
export class PermissionActionService {
  constructor(private readonly prisma: DatabaseService) {}

  create(data: CreatePermissionActionDto) {
    return this.prisma.permissionAction.create({ data });
  }

  findAll() {
    return this.prisma.permissionAction.findMany();
  }

  async findAllPaginated(options: SearchPermissionActionDto) {
    const where: any = {};
    if (options.search) where.action = { contains: options.search, mode: 'insensitive' };
    return paginate(this.prisma.permissionAction, { where }, { page: +options.page, perPage: +options.limit });
  }

  findOne(id: string) {
    return this.prisma.permissionAction.findUnique({
      where: { id },
    });
  }

  update(id: string, data: Partial<CreatePermissionActionDto>) {
    return this.prisma.permissionAction.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.permissionAction.delete({ where: { id } });
  }
}
