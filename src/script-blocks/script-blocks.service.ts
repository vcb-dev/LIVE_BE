import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlockType, Prisma } from '@prisma/client';
import type { AiScriptBlockSuggestion } from '../ai-integration/ai.service';
import { AiService } from '../ai-integration/ai.service';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedMeta } from '../common/pagination/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScriptBlockDto } from './dto/create-script-block.dto';
import type { GenerateMeaningSuggestionDto } from './dto/generate-meaning-suggestion.dto';
import { ListScriptBlocksQueryDto } from './dto/list-script-blocks-query.dto';
import { UpdateScriptBlockDto } from './dto/update-script-block.dto';
import {
  mapScriptBlockToResponse,
  scriptBlockInclude,
  type ScriptBlockResponse,
} from './mappers/script-block.mapper';
import { validateScriptBlockScope } from './script-blocks.rules';

@Injectable()
export class ScriptBlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async findAll(query: ListScriptBlocksQueryDto): Promise<PaginatedResponse<ScriptBlockResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.scriptBlock.findMany({
        where,
        include: scriptBlockInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.scriptBlock.count({ where }),
    ]);

    return {
      data: rows.map(mapScriptBlockToResponse),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<ScriptBlockResponse> {
    const block = await this.prisma.scriptBlock.findUnique({
      where: { id },
      include: scriptBlockInclude,
    });
    if (!block) {
      throw new NotFoundException('Không tìm thấy block kịch bản');
    }
    return mapScriptBlockToResponse(block);
  }

  async create(dto: CreateScriptBlockDto): Promise<ScriptBlockResponse> {
    validateScriptBlockScope(dto.type, dto.productId, dto.groupId);
    await this.ensureRelationsExist(dto.type, dto.groupId, dto.productId, dto.emotionIds);

    try {
      const block = await this.prisma.$transaction(async (tx) => {
        const sortOrder = dto.groupId
          ? await tx.scriptBlock.count({ where: { groupId: dto.groupId } })
          : 0;

        const created = await tx.scriptBlock.create({
          data: {
            type: dto.type,
            groupId: dto.groupId ?? null,
            productId: dto.productId ?? null,
            title: dto.title ?? null,
            content: dto.content,
            durationSec: dto.durationSec,
            weight: dto.weight ?? 1,
            sortOrder,
            isActive: dto.isActive ?? true,
          },
        });

        await this.syncEmotions(tx, created.id, dto.emotionIds ?? []);

        return created;
      });

      return this.findOne(block.id);
    } catch (error) {
      this.rethrowPrismaError(error, 'create');
      throw error;
    }
  }

  async update(id: string, dto: UpdateScriptBlockDto): Promise<ScriptBlockResponse> {
    const existing = await this.prisma.scriptBlock.findUnique({
      where: { id },
      select: { id: true, type: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy block kịch bản');
    }

    if (dto.emotionIds !== undefined) {
      await this.ensureEmotionsExist(dto.emotionIds);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.scriptBlock.update({
          where: { id },
          data: {
            ...(dto.title !== undefined ? { title: dto.title ?? null } : {}),
            ...(dto.content !== undefined ? { content: dto.content } : {}),
            ...(dto.durationSec !== undefined ? { durationSec: dto.durationSec } : {}),
            ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
        });

        if (dto.emotionIds !== undefined) {
          await this.syncEmotions(tx, id, dto.emotionIds);
        }
      });

      return this.findOne(id);
    } catch (error) {
      this.rethrowPrismaError(error, 'update');
      throw error;
    }
  }

  async generateMeaningSuggestion(
    dto: GenerateMeaningSuggestionDto,
  ): Promise<AiScriptBlockSuggestion> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        code: true,
        name: true,
        attributes: true,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    if (!product.isActive) {
      throw new BadRequestException('Sản phẩm đang bị tắt');
    }

    const attributes = this.toProductAttributes(product.attributes);

    return this.aiService.generateScriptBlock(
      BlockType.MEANING,
      {
        code: product.code,
        name: product.name,
        attributes,
      },
      dto.existingTitle,
    );
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    const usageCount = await this.prisma.segmentItem.count({
      where: { blockId: id },
    });
    if (usageCount > 0) {
      throw new ConflictException(
        'Không thể xóa block đã dùng trong phiên live — hãy tắt trạng thái hoạt động',
      );
    }

    try {
      await this.prisma.scriptBlock.delete({ where: { id } });
    } catch (error) {
      this.rethrowPrismaError(error, 'remove');
      throw error;
    }
  }

  private buildWhere(query: ListScriptBlocksQueryDto): Prisma.ScriptBlockWhereInput {
    const filters: Prisma.ScriptBlockWhereInput[] = [];

    if (query.q) {
      filters.push({
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { content: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }

    if (query.type) {
      filters.push({ type: query.type });
    }

    if (query.groupId) {
      filters.push({ groupId: query.groupId });
    }

    if (query.productId) {
      filters.push({ productId: query.productId });
    }

    if (query.isActive !== undefined) {
      filters.push({ isActive: query.isActive });
    }

    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0]!;
    return { AND: filters };
  }

  private async ensureRelationsExist(
    type: BlockType,
    groupId?: string,
    productId?: string,
    emotionIds?: string[],
  ): Promise<void> {
    if (groupId) {
      const group = await this.prisma.blockGroup.findUnique({
        where: { id: groupId },
        select: { id: true, type: true, isActive: true },
      });
      if (!group) {
        throw new NotFoundException('Không tìm thấy nhóm block');
      }
      if (!group.isActive) {
        throw new BadRequestException('Nhóm block đang bị tắt');
      }
      if (group.type !== type) {
        throw new BadRequestException('Nhóm block không khớp loại block');
      }
    }

    if (productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, isActive: true },
      });
      if (!product) {
        throw new NotFoundException('Không tìm thấy sản phẩm');
      }
      if (!product.isActive) {
        throw new BadRequestException('Sản phẩm đang bị tắt');
      }
    }

    if (emotionIds?.length) {
      await this.ensureEmotionsExist(emotionIds);
    }
  }

  private async ensureEmotionsExist(emotionIds: string[]): Promise<void> {
    const count = await this.prisma.emotion.count({
      where: { id: { in: emotionIds } },
    });
    if (count !== emotionIds.length) {
      throw new BadRequestException('Một hoặc nhiều biểu cảm không hợp lệ');
    }
  }

  private async syncEmotions(
    tx: Prisma.TransactionClient,
    blockId: string,
    emotionIds: string[],
  ): Promise<void> {
    await tx.blockEmotion.deleteMany({ where: { blockId } });

    if (emotionIds.length === 0) return;

    await tx.blockEmotion.createMany({
      data: emotionIds.map((emotionId) => ({ blockId, emotionId })),
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.scriptBlock.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Không tìm thấy block kịch bản');
    }
  }

  private toProductAttributes(value: Prisma.JsonValue | null): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private rethrowPrismaError(error: unknown, action: 'create' | 'update' | 'remove'): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;

    if (error.code === 'P2025') {
      throw new NotFoundException('Không tìm thấy block kịch bản');
    }

    if (action === 'remove' && error.code === 'P2003') {
      throw new ConflictException(
        'Không thể xóa block đã dùng trong phiên live — hãy tắt trạng thái hoạt động',
      );
    }
  }
}
