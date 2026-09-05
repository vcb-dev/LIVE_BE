import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlockType, Prisma } from '@prisma/client';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedMeta } from '../common/pagination/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlockGroupDto } from './dto/create-block-group.dto';
import { ListBlockGroupsQueryDto } from './dto/list-block-groups-query.dto';
import { UpdateBlockGroupDto } from './dto/update-block-group.dto';
import {
  mapBlockGroupToResponse,
  type BlockGroupResponse,
} from './mappers/block-group.mapper';

@Injectable()
export class BlockGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ListBlockGroupsQueryDto,
  ): Promise<PaginatedResponse<BlockGroupResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query.q, query.type);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.blockGroup.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.blockGroup.count({ where }),
    ]);

    return {
      data: rows.map(mapBlockGroupToResponse),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<BlockGroupResponse> {
    const group = await this.prisma.blockGroup.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Không tìm thấy nhóm block');
    }
    return mapBlockGroupToResponse(group);
  }

  async create(dto: CreateBlockGroupDto): Promise<BlockGroupResponse> {
    if (dto.type !== BlockType.CTA) {
      throw new BadRequestException('Chỉ CTA mới có nhóm block');
    }

    try {
      const group = await this.prisma.blockGroup.create({
        data: {
          type: dto.type,
          code: dto.code,
          name: dto.name,
          weight: dto.weight ?? 1,
          sortOrder: dto.sortOrder ?? 0,
          pickCount: dto.pickCount ?? 1,
          isActive: dto.isActive ?? true,
        },
      });
      return mapBlockGroupToResponse(group);
    } catch (error) {
      this.rethrowPrismaError(error, 'create');
      throw error;
    }
  }

  async update(id: string, dto: UpdateBlockGroupDto): Promise<BlockGroupResponse> {
    await this.ensureExists(id);

    try {
      const group = await this.prisma.blockGroup.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.pickCount !== undefined ? { pickCount: dto.pickCount } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      return mapBlockGroupToResponse(group);
    } catch (error) {
      this.rethrowPrismaError(error, 'update');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    const usageCount = await this.prisma.scriptBlock.count({
      where: { groupId: id },
    });
    if (usageCount > 0) {
      throw new ConflictException('Không thể xóa nhóm block đang được dùng trong kịch bản');
    }

    try {
      await this.prisma.blockGroup.delete({ where: { id } });
    } catch (error) {
      this.rethrowPrismaError(error, 'remove');
      throw error;
    }
  }

  private buildWhere(
    q?: string,
    type?: ListBlockGroupsQueryDto['type'],
  ): Prisma.BlockGroupWhereInput {
    const filters: Prisma.BlockGroupWhereInput[] = [];

    if (type) {
      filters.push({ type });
    }

    if (q) {
      filters.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0]!;
    return { AND: filters };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.blockGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Không tìm thấy nhóm block');
    }
  }

  private rethrowPrismaError(
    error: unknown,
    action: 'create' | 'update' | 'remove',
  ): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;

    if (error.code === 'P2002') {
      throw new ConflictException('Mã nhóm đã tồn tại trong loại block này');
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Không tìm thấy nhóm block');
    }

    if (action === 'remove' && error.code === 'P2003') {
      throw new ConflictException('Không thể xóa nhóm block đang được dùng trong kịch bản');
    }
  }
}
