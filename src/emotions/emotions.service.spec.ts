/// <reference types="jest" />

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CloudinaryStorageService } from '../cloudinary/cloudinary-storage.service';
import { EmotionsService } from './emotions.service';
import { PrismaService } from '../prisma/prisma.service';

const now = new Date('2026-08-27T00:00:00.000Z');

const sampleEmotion = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'HAPPY',
  name: 'Vui',
  imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  createdAt: now,
  updatedAt: now,
};

describe('EmotionsService', () => {
  let service: EmotionsService;

  const prisma = {
    emotion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    blockEmotion: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const cloudinary = {
    uploadObject: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmotionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryStorageService, useValue: cloudinary },
      ],
    }).compile();

    service = moduleRef.get(EmotionsService);
  });

  describe('findAll', () => {
    it('returns paginated emotions', async () => {
      prisma.$transaction.mockResolvedValue([[sampleEmotion], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.code).toBe('HAPPY');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('throws when emotion is missing', async () => {
      prisma.emotion.findUnique.mockResolvedValue(null);

      await expect(service.findOne(sampleEmotion.id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates emotion and maps response', async () => {
      prisma.emotion.create.mockResolvedValue(sampleEmotion);

      const result = await service.create({
        code: 'HAPPY',
        name: 'Vui',
        imageUrl: sampleEmotion.imageUrl ?? undefined,
      });

      expect(result.id).toBe(sampleEmotion.id);
      expect(result.createdAt).toBe(now.toISOString());
    });

    it('maps duplicate code to conflict', async () => {
      prisma.emotion.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        service.create({ code: 'HAPPY', name: 'Vui' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('blocks delete when emotion is in use', async () => {
      prisma.emotion.findUnique.mockResolvedValue({ id: sampleEmotion.id });
      prisma.blockEmotion.count.mockResolvedValue(2);

      await expect(service.remove(sampleEmotion.id)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.emotion.delete).not.toHaveBeenCalled();
    });

    it('deletes unused emotion', async () => {
      prisma.emotion.findUnique.mockResolvedValue({ id: sampleEmotion.id });
      prisma.blockEmotion.count.mockResolvedValue(0);
      prisma.emotion.delete.mockResolvedValue(sampleEmotion);

      await expect(service.remove(sampleEmotion.id)).resolves.toBeUndefined();
      expect(prisma.emotion.delete).toHaveBeenCalledWith({ where: { id: sampleEmotion.id } });
    });
  });
});
