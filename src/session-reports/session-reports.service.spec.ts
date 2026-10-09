/// <reference types="jest" />

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LiveLookupKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SessionReportsService } from './session-reports.service';

const decimal = (value: number) => ({ toNumber: () => value });

const shiftId = '11111111-1111-4111-8111-111111111111';
const liveTypeId = '22222222-2222-4222-8222-222222222222';
const teamId = '33333333-3333-4333-8333-333333333333';
const channelId = '44444444-4444-4444-8444-444444444444';
const sessionId = '55555555-5555-4555-8555-555555555555';

const inputDto = {
  sessionId,
  liveDate: '2026-10-08',
  staffName: 'Lan',
  shiftId,
  liveTypeId,
  teamId,
  channelId,
  totalHours: 4.5,
  revenue: 12000000,
  viewCount: 300,
  retentionRate: 42.5,
  orderCount: 15,
  impressionCount: 8000,
};

const lookups = [
  { id: shiftId, kind: LiveLookupKind.SHIFT },
  { id: liveTypeId, kind: LiveLookupKind.LIVE_TYPE },
  { id: teamId, kind: LiveLookupKind.TEAM },
  { id: channelId, kind: LiveLookupKind.CHANNEL },
];

describe('SessionReportsService', () => {
  let service: SessionReportsService;

  const prisma = {
    liveSession: { findUnique: jest.fn() },
    liveLookup: { findMany: jest.fn() },
    sessionReport: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [SessionReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(SessionReportsService);
  });

  it('creates a report when the session and lookups match', async () => {
    prisma.liveSession.findUnique.mockResolvedValue({ id: sessionId });
    prisma.liveLookup.findMany.mockResolvedValue(lookups);
    prisma.sessionReport.create.mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      submittedById: 'user-1',
      ...inputDto,
      liveDate: new Date('2026-10-08T00:00:00.000Z'),
      totalHours: decimal(4.5),
      revenue: decimal(12000000),
      retentionRate: decimal(42.5),
      createdAt: new Date('2026-10-08T12:00:00.000Z'),
      updatedAt: new Date('2026-10-08T12:00:00.000Z'),
      shift: { id: shiftId, name: 'Tối' },
      liveType: { id: liveTypeId, name: 'Live mới' },
      team: { id: teamId, name: 'Team 1' },
      channel: { id: channelId, name: 'Facebook' },
      session: { id: sessionId, name: 'Live tối' },
    });

    const actual = await service.create(inputDto, 'user-1');

    expect(actual.sessionName).toBe('Live tối');
    expect(actual.staffName).toBe('Lan');
    expect(actual.shift.name).toBe('Tối');
    expect(actual.revenue).toBe(12000000);
    expect(prisma.sessionReport.create).toHaveBeenCalledTimes(1);
  });

  it('lists reports newest live date first', async () => {
    const row = {
      id: '66666666-6666-4666-8666-666666666666',
      submittedById: 'user-1',
      ...inputDto,
      liveDate: new Date('2026-10-08T00:00:00.000Z'),
      totalHours: decimal(4.5),
      revenue: decimal(12000000),
      retentionRate: decimal(42.5),
      createdAt: new Date('2026-10-08T12:00:00.000Z'),
      updatedAt: new Date('2026-10-08T12:00:00.000Z'),
      shift: { id: shiftId, name: 'Tối' },
      liveType: { id: liveTypeId, name: 'Live mới' },
      team: { id: teamId, name: 'Team 1' },
      channel: { id: channelId, name: 'Facebook' },
      session: { id: sessionId, name: 'Live tối' },
    };
    prisma.$transaction.mockResolvedValue([[row], 1]);

    const actual = await service.findAll({ page: 1, limit: 20 });

    expect(actual.data).toHaveLength(1);
    expect(actual.data[0]?.staffName).toBe('Lan');
    expect(actual.meta.total).toBe(1);
  });

  it('filters by live date range', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.findAll({ page: 1, limit: 20, from: '2026-10-01', to: '2026-10-08' });

    expect(prisma.sessionReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          liveDate: {
            gte: new Date('2026-10-01T00:00:00.000Z'),
            lte: new Date('2026-10-08T00:00:00.000Z'),
          },
        },
      }),
    );
  });

  it('throws when the session does not exist', async () => {
    prisma.liveSession.findUnique.mockResolvedValue(null);

    await expect(service.create(inputDto, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.sessionReport.create).not.toHaveBeenCalled();
  });

  it('throws when a lookup is the wrong kind', async () => {
    prisma.liveSession.findUnique.mockResolvedValue({ id: sessionId });
    prisma.liveLookup.findMany.mockResolvedValue(
      lookups.map((row) =>
        row.id === channelId ? { ...row, kind: LiveLookupKind.TEAM } : row,
      ),
    );

    await expect(service.create(inputDto, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sessionReport.create).not.toHaveBeenCalled();
  });
});
