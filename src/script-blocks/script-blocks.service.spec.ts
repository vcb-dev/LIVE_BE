/// <reference types="jest" />

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BlockType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScriptBlocksService } from './script-blocks.service';

const now = new Date('2026-08-27T00:00:00.000Z');

const productId = '11111111-1111-4111-8111-111111111111';
const groupId = '22222222-2222-4222-8222-222222222222';
const emotionId = '33333333-3333-4333-8333-333333333333';

const sampleBlock = {
  id: '44444444-4444-4444-8444-444444444444',
  type: BlockType.STORY,
  groupId: null,
  productId,
  categoryId: null,
  title: 'Câu chuyện mẫu',
  content: 'Nội dung câu chuyện',
  durationSec: 60,
  weight: 1,
  sortOrder: 0,
  usageCount: 0,
  lastUsedAt: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  group: null,
  product: { id: productId, code: 'SP001', name: 'Nhẫn vàng' },
  emotions: [
    {
      emotion: {
        id: emotionId,
        code: 'HAPPY',
        name: 'Vui',
        imageUrl: null,
      },
    },
  ],
};

describe('ScriptBlocksService', () => {
  let service: ScriptBlocksService;

  const prisma = {
    scriptBlock: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    blockGroup: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    emotion: {
      count: jest.fn(),
    },
    blockEmotion: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    segmentItem: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [ScriptBlocksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ScriptBlocksService);
  });

  describe('findAll', () => {
    it('returns paginated script blocks', async () => {
      prisma.$transaction.mockResolvedValue([[sampleBlock], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.type).toBe(BlockType.STORY);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('throws when block is missing', async () => {
      prisma.scriptBlock.findUnique.mockResolvedValue(null);

      await expect(service.findOne(sampleBlock.id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('throws when STORY has no productId', async () => {
      await expect(
        service.create({
          type: BlockType.STORY,
          content: 'Nội dung',
          durationSec: 30,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when CTA has no groupId', async () => {
      await expect(
        service.create({
          type: BlockType.CTA,
          content: 'Kêu gọi',
          durationSec: 20,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates GAME block without groupId', async () => {
      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          scriptBlock: {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockResolvedValue({ id: sampleBlock.id }),
          },
          blockEmotion: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        }),
      );
      prisma.scriptBlock.findUnique.mockResolvedValue({
        ...sampleBlock,
        type: BlockType.GAME,
        groupId: null,
        group: null,
        product: null,
        productId: null,
      });

      const result = await service.create({
        type: BlockType.GAME,
        content: 'Đoán giá sản phẩm',
        durationSec: 60,
      });

      expect(result.type).toBe(BlockType.GAME);
    });

    it('creates block and maps response', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: productId, isActive: true });
      prisma.emotion.count.mockResolvedValue(1);
      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          scriptBlock: {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockResolvedValue({ id: sampleBlock.id }),
          },
          blockEmotion: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        }),
      );
      prisma.scriptBlock.findUnique.mockResolvedValue(sampleBlock);

      const result = await service.create({
        type: BlockType.STORY,
        productId,
        content: 'Nội dung câu chuyện',
        durationSec: 60,
        emotionIds: [emotionId],
      });

      expect(result.id).toBe(sampleBlock.id);
      expect(result.productCode).toBe('SP001');
    });
  });

  describe('remove', () => {
    it('throws when block is used in live session', async () => {
      prisma.scriptBlock.findUnique.mockResolvedValue({ id: sampleBlock.id });
      prisma.segmentItem.count.mockResolvedValue(2);

      await expect(service.remove(sampleBlock.id)).rejects.toBeInstanceOf(ConflictException);
    });

    it('deletes block when unused', async () => {
      prisma.scriptBlock.findUnique.mockResolvedValue({ id: sampleBlock.id });
      prisma.segmentItem.count.mockResolvedValue(0);
      prisma.scriptBlock.delete.mockResolvedValue(sampleBlock);

      await service.remove(sampleBlock.id);

      expect(prisma.scriptBlock.delete).toHaveBeenCalledWith({ where: { id: sampleBlock.id } });
    });
  });
});
