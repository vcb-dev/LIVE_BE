/// <reference types="jest" />

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CloudinaryStorageService } from '../cloudinary/cloudinary-storage.service';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

const now = new Date('2026-08-27T00:00:00.000Z');

const sampleProduct = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'SP001',
  name: 'Nhẫn vàng',
  categoryId: null,
  attributes: null,
  description: 'Mô tả',
  images: [],
  videoUrl: null,
  sapoId: null,
  sapoUrl: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  category: null,
  variants: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      productId: '11111111-1111-4111-8111-111111111111',
      sku: 'SP001-S',
      name: 'Size S',
      price: new Prisma.Decimal('1000000'),
      stock: 5,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
};

describe('ProductsService', () => {
  let service: ProductsService;

  const prisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productVariant: {
      deleteMany: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    scriptBlock: {
      count: jest.fn(),
    },
    sessionSegment: {
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
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryStorageService, useValue: cloudinary },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  describe('findAll', () => {
    it('returns paginated products', async () => {
      prisma.$transaction.mockResolvedValue([[sampleProduct], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.code).toBe('SP001');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('throws when product is missing', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(sampleProduct.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates product and maps response', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue(sampleProduct);

      const result = await service.create({
        code: 'SP001',
        name: 'Nhẫn vàng',
        variants: [{ sku: 'SP001-S', name: 'Size S', price: 1000000, stock: 5 }],
      });

      expect(result.id).toBe(sampleProduct.id);
      expect(result.variants).toHaveLength(1);
    });

    it('maps duplicate code to conflict', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.product.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['code'] },
        }),
      );

      await expect(
        service.create({ code: 'SP001', name: 'Nhẫn vàng' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects duplicate variant skus in payload', async () => {
      await expect(
        service.create({
          code: 'SP001',
          name: 'Nhẫn vàng',
          variants: [
            { sku: 'SKU-1' },
            { sku: 'SKU-1' },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('blocks delete when product is in use', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: sampleProduct.id });
      prisma.$transaction.mockResolvedValue([2, 0]);

      await expect(service.remove(sampleProduct.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('deletes unused product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: sampleProduct.id });
      prisma.$transaction.mockResolvedValue([0, 0]);
      prisma.product.delete.mockResolvedValue(sampleProduct);

      await expect(service.remove(sampleProduct.id)).resolves.toBeUndefined();
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: sampleProduct.id },
      });
    });
  });
});
