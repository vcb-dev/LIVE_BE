import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedMeta } from '../common/pagination/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLiveLookupDto } from './dto/create-live-lookup.dto';
import { ListLiveLookupsQueryDto } from './dto/list-live-lookups-query.dto';
import { UpdateLiveLookupDto } from './dto/update-live-lookup.dto';
import { mapLiveLookupToResponse, type LiveLookupResponse } from './mappers/live-lookup.mapper';

@Injectable()
export class LiveLookupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListLiveLookupsQueryDto): Promise<PaginatedResponse<LiveLookupResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.LiveLookupWhereInput = {
      kind: query.kind,
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.liveLookup.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.liveLookup.count({ where }),
    ]);

    return {
      data: rows.map(mapLiveLookupToResponse),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }

  async create(dto: CreateLiveLookupDto): Promise<LiveLookupResponse> {
    try {
      const row = await this.prisma.liveLookup.create({ data: dto });
      return mapLiveLookupToResponse(row);
    } catch (error) {
      this.rethrowKnown(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateLiveLookupDto): Promise<LiveLookupResponse> {
    await this.ensureExists(id);
    try {
      const row = await this.prisma.liveLookup.update({ where: { id }, data: { name: dto.name } });
      return mapLiveLookupToResponse(row);
    } catch (error) {
      this.rethrowKnown(error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    try {
      await this.prisma.liveLookup.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Không thể xóa mục đang được dùng trong báo cáo ca');
      }
      throw error;
    }
  }

  private async ensureExists(id: string): Promise<void> {
    const row = await this.prisma.liveLookup.findUnique({ where: { id }, select: { id: true } });
    if (!row) throw new NotFoundException('Không tìm thấy mục');
  }

  private rethrowKnown(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Tên này đã có trong danh mục');
    }
  }
}
