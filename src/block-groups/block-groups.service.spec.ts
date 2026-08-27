/// <reference types="jest" />

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BlockType, Prisma } from '@prisma/client';
import { BlockGroupsService } from './block-groups.service';
import { PrismaService } from '../prisma/prisma.service';

const now = new Date('2026-08-27T00:00:00.000Z');

const sampleBlockGroup = {
  id: '11111111-1111-4111-8111-111111111111',
  type: BlockType.CTA,
  code: 'TUONG_TAC',
  name: 'Tương tác',
  weight: 1,
  sortOrder: 0,
  pickCount: 1,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

describe('BlockGroupsService', () => {
  let service: BlockGroupsService;

  const prisma = {
    blockGroup: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    scriptBlock: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        BlockGroupsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(BlockGroupsService);
  });

  describe('findAll', () => {
    it('returns paginated block groups', async () => {
      prisma.$transaction.mockResolvedValue([[sampleBlockGroup], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.code).toBe('TUONG_TAC');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('throws when block group is missing', async () => {
      prisma.blockGroup.findUnique.mockResolvedValue(null);

      await expect(service.findOne(sampleBlockGroup.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates block group and maps response', async () => {
      prisma.blockGroup.create.mockResolvedValue(sampleBlockGroup);

      const result = await service.create({
        type: BlockType.CTA,
        code: 'TUONG_TAC',
        name: 'Tương tác',
      });

      expect(result.id).toBe(sampleBlockGroup.id);
      expect(result.createdAt).toBe(now.toISOString());
    });

    it('maps duplicate code to conflict', async () => {
      prisma.blockGroup.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        service.create({
          type: BlockType.CTA,
          code: 'TUONG_TAC',
          name: 'Tương tác',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('blocks delete when block group is in use', async () => {
      prisma.blockGroup.findUnique.mockResolvedValue({ id: sampleBlockGroup.id });
      prisma.scriptBlock.count.mockResolvedValue(2);

      await expect(service.remove(sampleBlockGroup.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.blockGroup.delete).not.toHaveBeenCalled();
    });

    it('deletes unused block group', async () => {
      prisma.blockGroup.findUnique.mockResolvedValue({ id: sampleBlockGroup.id });
      prisma.scriptBlock.count.mockResolvedValue(0);
      prisma.blockGroup.delete.mockResolvedValue(sampleBlockGroup);

      await expect(service.remove(sampleBlockGroup.id)).resolves.toBeUndefined();
      expect(prisma.blockGroup.delete).toHaveBeenCalledWith({
        where: { id: sampleBlockGroup.id },
      });
    });
  });
});
