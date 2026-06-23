import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { CreatePartnerDto, UpdatePartnerDto, SearchPartnerDto } from './dto';
import { paginate } from '../../common/utils/paginater';
import { Prisma } from '@prisma/client';

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(data: CreatePartnerDto) {
    const existing = await this.prisma.partner.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException(`Partner with name '${data.name}' already exists`);
    }

    return await this.prisma.partner.create({
      data: {
        name: data.name,
      },
    });
  }

  async findAllPaginated(options: SearchPartnerDto) {
    const { search } = options;
    const where: Prisma.PartnerWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    return await paginate(
      this.prisma.partner,
      {
        where,
        orderBy: { name: 'asc' },
      },
      { page: options.page, perPage: options.limit },
    );
  }

  async findOne(id: string) {
    const record = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        _count: {
          select: { engagements: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Partner not found');
    }

    return record;
  }

  async update(id: string, data: UpdatePartnerDto) {
    const record = await this.findOne(id);

    if (data.name && data.name !== record.name) {
      const existing = await this.prisma.partner.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new ConflictException(`Partner with name '${data.name}' already exists`);
      }
    }

    return await this.prisma.partner.update({
      where: { id },
      data: {
        name: data.name,
      },
    });
  }

  async remove(id: string) {
    const record = await this.findOne(id);

    if (record._count.engagements > 0) {
      throw new BadRequestException('Cannot delete a partner that is linked to engagements');
    }

    await this.prisma.partner.delete({
      where: { id },
    });

    return { message: 'Partner deleted successfully' };
  }
}
