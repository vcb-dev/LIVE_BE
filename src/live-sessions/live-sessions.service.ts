import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlockType, Prisma, SegmentKind, SessionStatus } from '@prisma/client';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedMeta } from '../common/pagination/paginate';
import { PRISMA_TRANSACTION_OPTIONS } from '../prisma/prisma-transaction.options';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { ListLiveSessionsQueryDto } from './dto/list-live-sessions-query.dto';
import type { SessionSlotDto } from './dto/session-slot.dto';
import { planTimeline } from './live-sessions.generate';
import {
  liveSessionDetailInclude,
  liveSessionListInclude,
  mapLiveSessionToDetailResponse,
  mapLiveSessionToListResponse,
  type LiveSessionDetailResponse,
  type LiveSessionListResponse,
} from './mappers/live-session.mapper';

const blockSelect = {
  id: true,
  type: true,
  groupId: true,
  productId: true,
  title: true,
  content: true,
  durationSec: true,
  weight: true,
  lastUsedAt: true,
  emotions: { include: { emotion: { select: { code: true, imageUrl: true } } } },
} satisfies Prisma.ScriptBlockSelect;

/**
 * Hàm này để chuyển đổi segments thành slots để xây dựng plan
 * @param segments segments của phiên live
 * @returns slots của phiên live
 */
function ctaGroupId(
  blockId: string | null | undefined,
  ctaGroupByBlockId: Map<string, string | null>,
): string | undefined {
  if (!blockId) return undefined;
  return ctaGroupByBlockId.get(blockId) ?? undefined;
}

function slotsFromSegments(
  segments: Array<{
    kind: SegmentKind;
    productId: string | null;
    plannedSec: number;
    items: Array<{ type: BlockType; plannedSec: number; blockId: string | null }>;
  }>,
  ctaGroupByBlockId: Map<string, string | null>,
): SessionSlotDto[] {
  const slots: SessionSlotDto[] = [];

  for (const segment of segments) {
    if (segment.kind === SegmentKind.INTERLUDE) {
      const cta = segment.items.find((item) => item.type === BlockType.CTA);
      const game = segment.items.find((item) => item.type === BlockType.GAME);
      if (cta) {
        slots.push({
          kind: SegmentKind.CTA,
          plannedSec: cta.plannedSec,
          groupId: ctaGroupId(cta.blockId, ctaGroupByBlockId),
        });
      }
      if (game) {
        slots.push({ kind: SegmentKind.GAME, plannedSec: game.plannedSec });
      }
      if (!cta && !game) {
        slots.push({ kind: SegmentKind.CTA, plannedSec: segment.plannedSec });
      }
      continue;
    }

    const firstBlockId = segment.items.find((item) => item.blockId)?.blockId;

    slots.push({
      kind: segment.kind as SessionSlotDto['kind'],
      productId: segment.productId ?? undefined,
      plannedSec: segment.plannedSec,
      groupId:
        segment.kind === SegmentKind.CTA ? ctaGroupId(firstBlockId, ctaGroupByBlockId) : undefined,
    });
  }

  return slots;
}

@Injectable()
export class LiveSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ListLiveSessionsQueryDto,
  ): Promise<PaginatedResponse<LiveSessionListResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.LiveSessionWhereInput = query.status ? { status: query.status } : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.liveSession.findMany({
        where,
        include: liveSessionListInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.liveSession.count({ where }),
    ]);

    return {
      data: rows.map(mapLiveSessionToListResponse),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<LiveSessionDetailResponse> {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
      include: liveSessionDetailInclude,
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên live');
    }
    return mapLiveSessionToDetailResponse(session);
  }

  async create(dto: CreateLiveSessionDto): Promise<LiveSessionDetailResponse> {
    const plan = await this.buildPlan(dto.slots);

    const created = await this.prisma.$transaction(async (tx) => {
      const session = await tx.liveSession.create({
        data: {
          name: dto.name,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          plannedSec: plan.plannedSec,
          status: SessionStatus.DRAFT,
        },
      });
      await this.persistPlan(tx, session.id, plan.segments);
      return session;
      // PRISMA_TRANSACTION_OPTIONS là dependency injection của NestJS để tự động rollback transaction nếu có lỗi
    }, PRISMA_TRANSACTION_OPTIONS);

    return this.findOne(created.id);
  }
  /**
   * Hàm này để regenerate phiên live sau khi tạo phiên live
   * @param id id của phiên live
   * @returns phiên live sau khi regenerate
   */
  async regenerate(id: string): Promise<LiveSessionDetailResponse> {
    const existing = await this.prisma.liveSession.findUnique({
      where: { id },
      include: liveSessionDetailInclude,
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy phiên live');
    }
    if (existing.status !== SessionStatus.DRAFT) {
      throw new ConflictException('Chỉ regenerate phiên nháp');
    }

    // Lấy các blockId của các blocks CTA
    const ctaBlockIds = [
      ...new Set(
        existing.segments.flatMap((segment) =>
          segment.items
            .filter((item) => item.type === BlockType.CTA && item.blockId)
            .map((item) => item.blockId as string),
        ),
      ),
    ];
    // Lấy các blocks CTA
    const ctaBlocks =
      ctaBlockIds.length === 0
        ? []
        : await this.prisma.scriptBlock.findMany({
            where: { id: { in: ctaBlockIds } },
            select: { id: true, groupId: true },
          });
    // Tạo map của blockId và groupId của các blocks CTA
    const ctaGroupByBlockId = new Map(ctaBlocks.map((block) => [block.id, block.groupId]));

    // Chuyển đổi segments thành slots
    const slots = slotsFromSegments(existing.segments, ctaGroupByBlockId);
    // Xây dựng plan
    const plan = await this.buildPlan(slots);

    await this.prisma.$transaction(async (tx) => {
      await tx.sessionSegment.deleteMany({ where: { sessionId: id } });
      await tx.liveSession.update({
        where: { id },
        data: { plannedSec: plan.plannedSec },
      });
      await this.persistPlan(tx, id, plan.segments);
    }, PRISMA_TRANSACTION_OPTIONS);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.liveSession.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy phiên live');
    }
    if (existing.status !== SessionStatus.DRAFT) {
      throw new ConflictException('Chỉ xóa được phiên nháp');
    }
    await this.prisma.liveSession.delete({ where: { id } });
  }

  /**
   * Hàm này để xây dựng plan cho phiên live trả về tổng thời lượng của phiên live và segments của phiên live
   * @param slots slots của phiên live
   * @returns plan của phiên live
   */
  private async buildPlan(slots: SessionSlotDto[]) {
    // Lấy id của các sản phẩm
    const productIds = [
      ...new Set(
        slots
          .filter((slot) => slot.kind === SegmentKind.PRODUCT)
          .map((slot) => slot.productId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    // Lấy các blocks của phiên live
    const [products, openingBlocks, closingBlocks, ctaBlocks, gameBlocks, productBlocks] =
      await Promise.all([
        productIds.length === 0
          ? Promise.resolve([])
          : this.prisma.product.findMany({
              where: { id: { in: productIds }, isActive: true },
              select: { id: true, code: true, name: true, attributes: true, images: true },
            }),
        this.prisma.scriptBlock.findMany({
          where: { type: BlockType.OPENING, isActive: true },
          select: blockSelect,
        }),
        this.prisma.scriptBlock.findMany({
          where: { type: BlockType.CLOSING, isActive: true },
          select: blockSelect,
        }),
        this.prisma.scriptBlock.findMany({
          where: { type: BlockType.CTA, isActive: true, groupId: { not: null } },
          select: blockSelect,
        }),
        this.prisma.scriptBlock.findMany({
          where: { type: BlockType.GAME, isActive: true },
          select: blockSelect,
        }),
        productIds.length === 0
          ? Promise.resolve([])
          : this.prisma.scriptBlock.findMany({
              where: {
                isActive: true,
                productId: { in: productIds },
                type: { in: [BlockType.PRODUCT_SPEC, BlockType.STORY, BlockType.MEANING] },
              },
              select: blockSelect,
            }),
      ]);

    // Kiểm tra nếu có sản phẩm không tồn tại hoặc đã tắt
    if (products.length !== productIds.length) {
      throw new BadRequestException('Có sản phẩm không tồn tại hoặc đã tắt');
    }

    // Xây dựng plan cho phiên live
    return planTimeline(slots, {
      products,
      openingBlocks,
      closingBlocks,
      ctaBlocks,
      gameBlocks,
      productBlocks,
    });
  }

  /**
   * Hàm này để lưu plan vào database sau khi tạo phiên live hoặc regenerate phiên live
   * @param tx transaction client
   * @param sessionId id của phiên live
   * @param segments segments của phiên live
   */
  private async persistPlan(
    tx: Prisma.TransactionClient,
    sessionId: string,
    segments: ReturnType<typeof planTimeline>['segments'],
  ): Promise<void> {
    // Set để lưu trữ các blockId đã sử dụng
    const usedBlockIds = new Set<string>();
    // Lưu segments vào database
    for (const [position, segment] of segments.entries()) {
      // Lưu segment vào database
      const created = await tx.sessionSegment.create({
        data: {
          sessionId,
          kind: segment.kind,
          productId: segment.productId,
          productImageUrl: segment.productImageUrl,
          position,
          plannedSec: segment.plannedSec,
        },
      });

      // Lưu items vào database
      await tx.segmentItem.createMany({
        data: segment.items.map((item, itemPosition) => {
          // Thêm blockId vào set để cập nhật thời gian và số lần sử dụng của block
          if (item.blockId) usedBlockIds.add(item.blockId);
          return {
            segmentId: created.id,
            blockId: item.blockId,
            position: itemPosition,
            type: item.type,
            title: item.title,
            content: item.content,
            emotionCodes: item.emotionCodes,
            emotionImageUrls: item.emotionImageUrls,
            plannedSec: item.plannedSec,
          };
        }),
      });
    }
    // Cập nhật thời gian sử dụng của các blocks
    if (usedBlockIds.size > 0) {
      // Cập nhật thời gian và số lần sử dụng của các blocks vào database
      await tx.scriptBlock.updateMany({
        where: { id: { in: [...usedBlockIds] } },
        data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
      });
    }
  }
}
