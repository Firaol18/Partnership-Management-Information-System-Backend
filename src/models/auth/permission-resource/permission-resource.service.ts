import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { CreatePermissionResourceDto, SearchPermissionResourceDto } from './dto/create-permission-resource.dto';
import { paginate } from '../../../common/utils/paginater';

@Injectable()
export class PermissionResourceService {
  constructor(private readonly prisma: DatabaseService) {}

  create(data: CreatePermissionResourceDto) {
    return this.prisma.permissionResource.create({ data });
  }

  findAll() {
    return this.prisma.permissionResource.findMany();
  }

  async findAllPaginated(options: SearchPermissionResourceDto) {
    const where: any = {};
    if (options.search) where.name = { contains: options.search, mode: 'insensitive' };
    return paginate(this.prisma.permissionResource, { where }, { page: +options.page, perPage: +options.limit });
  }

  findOne(id: string) {
    return this.prisma.permissionResource.findUnique({
      where: { id },
    });
  }

  update(id: string, data: Partial<CreatePermissionResourceDto>) {
    return this.prisma.permissionResource.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.permissionResource.delete({ where: { id } });
  }
}
