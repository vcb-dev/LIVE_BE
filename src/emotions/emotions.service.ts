import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CloudinaryStorageService } from '../cloudinary/cloudinary-storage.service';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedMeta } from '../common/pagination/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmotionDto } from './dto/create-emotion.dto';
import { ListEmotionsQueryDto } from './dto/list-emotions-query.dto';
import { UpdateEmotionDto } from './dto/update-emotion.dto';
import {
  EMOTION_IMAGE_MAX_BYTES,
  EMOTION_IMAGE_MIMES,
  type EmotionImageUploadResponse,
} from './emotion-image.constants';
import { mapEmotionToResponse, type EmotionResponse } from './mappers/emotion.mapper';

@Injectable()
export class EmotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryStorageService,
  ) {}

  async findAll(query: ListEmotionsQueryDto): Promise<PaginatedResponse<EmotionResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query.q);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.emotion.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.emotion.count({ where }),
    ]);

    return {
      data: rows.map(mapEmotionToResponse),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<EmotionResponse> {
    const emotion = await this.prisma.emotion.findUnique({ where: { id } });
    if (!emotion) {
      throw new NotFoundException('Không tìm thấy biểu cảm');
    }
    return mapEmotionToResponse(emotion);
  }

  async create(dto: CreateEmotionDto): Promise<EmotionResponse> {
    try {
      const emotion = await this.prisma.emotion.create({
        data: {
          code: dto.code,
          name: dto.name,
          imageUrl: dto.imageUrl ?? null,
        },
      });
      return mapEmotionToResponse(emotion);
    } catch (error) {
      this.rethrowPrismaError(error, 'create');
      throw error;
    }
  }

  async update(id: string, dto: UpdateEmotionDto): Promise<EmotionResponse> {
    await this.ensureExists(id);

    try {
      const emotion = await this.prisma.emotion.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl ?? null } : {}),
        },
      });
      return mapEmotionToResponse(emotion);
    } catch (error) {
      this.rethrowPrismaError(error, 'update');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    const usageCount = await this.prisma.blockEmotion.count({
      where: { emotionId: id },
    });
    if (usageCount > 0) {
      throw new ConflictException('Không thể xóa biểu cảm đang được dùng trong kịch bản');
    }

    try {
      await this.prisma.emotion.delete({ where: { id } });
    } catch (error) {
      this.rethrowPrismaError(error, 'remove');
      throw error;
    }
  }

  async uploadImage(file: Express.Multer.File | undefined): Promise<EmotionImageUploadResponse> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh để tải lên');
    }

    if (!EMOTION_IMAGE_MIMES.includes(file.mimetype as (typeof EMOTION_IMAGE_MIMES)[number])) {
      throw new BadRequestException('Ảnh phải là JPG, PNG, WEBP hoặc GIF');
    }

    if (file.size > EMOTION_IMAGE_MAX_BYTES) {
      throw new BadRequestException('Ảnh không được lớn hơn 10MB');
    }

    const ext = file.originalname.includes('.')
      ? file.originalname.slice(file.originalname.lastIndexOf('.'))
      : '.jpg';
    const storagePath = `emotions/${randomUUID()}${ext}`;

    const uploaded = await this.cloudinary.uploadObject(
      storagePath,
      file.buffer,
      file.mimetype,
    );

    return { imageUrl: uploaded.publicUrl };
  }

  private buildWhere(q?: string): Prisma.EmotionWhereInput {
    if (!q) return {};

    return {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.emotion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Không tìm thấy biểu cảm');
    }
  }

  private rethrowPrismaError(error: unknown, action: 'create' | 'update' | 'remove'): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;

    if (error.code === 'P2002') {
      throw new ConflictException('Mã biểu cảm đã tồn tại');
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Không tìm thấy biểu cảm');
    }

    if (action === 'remove' && error.code === 'P2003') {
      throw new ConflictException('Không thể xóa biểu cảm đang được dùng trong kịch bản');
    }
  }
}
