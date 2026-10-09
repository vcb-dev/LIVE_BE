import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LiveLookupKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedMeta } from '../common/pagination/paginate';
import { CreateSessionReportDto } from './dto/create-session-report.dto';
import { ListSessionReportsQueryDto } from './dto/list-session-reports-query.dto';
import {
  mapSessionReportToResponse,
  type SessionReportResponse,
} from './mappers/session-report.mapper';

const reportInclude = {
  shift: true,
  liveType: true,
  team: true,
  channel: true,
  session: { select: { id: true, name: true } },
} satisfies Prisma.SessionReportInclude;

@Injectable()
export class SessionReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListSessionReportsQueryDto): Promise<PaginatedResponse<SessionReportResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SessionReportWhereInput = {
      ...(query.q ? { staffName: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.from || query.to
        ? {
            liveDate: {
              ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.sessionReport.findMany({
        where,
        include: reportInclude,
        orderBy: [{ liveDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sessionReport.count({ where }),
    ]);

    return {
      data: rows.map(mapSessionReportToResponse),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }

  async create(dto: CreateSessionReportDto, submittedById: string): Promise<SessionReportResponse> {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: dto.sessionId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên live');
    }

    await this.ensureLookups(dto);

    const report = await this.prisma.sessionReport.create({
      data: {
        sessionId: dto.sessionId,
        submittedById,
        liveDate: new Date(`${dto.liveDate}T00:00:00.000Z`),
        staffName: dto.staffName,
        shiftId: dto.shiftId,
        liveTypeId: dto.liveTypeId,
        teamId: dto.teamId,
        channelId: dto.channelId,
        totalHours: new Prisma.Decimal(dto.totalHours),
        revenue: new Prisma.Decimal(dto.revenue),
        viewCount: dto.viewCount,
        retentionRate: new Prisma.Decimal(dto.retentionRate),
        orderCount: dto.orderCount,
        impressionCount: dto.impressionCount,
      },
      include: reportInclude,
    });

    return mapSessionReportToResponse(report);
  }

  private async ensureLookups(dto: CreateSessionReportDto): Promise<void> {
    const expected = new Map<string, LiveLookupKind>([
      [dto.shiftId, LiveLookupKind.SHIFT],
      [dto.liveTypeId, LiveLookupKind.LIVE_TYPE],
      [dto.teamId, LiveLookupKind.TEAM],
      [dto.channelId, LiveLookupKind.CHANNEL],
    ]);

    const rows = await this.prisma.liveLookup.findMany({
      where: { id: { in: [...expected.keys()] } },
      select: { id: true, kind: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row.kind]));

    for (const [id, kind] of expected) {
      if (byId.get(id) !== kind) {
        throw new BadRequestException('Ca, phân loại, team hoặc kênh không hợp lệ');
      }
    }
  }
}
