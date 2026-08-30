import { BlockType, SegmentKind } from '@prisma/client';
import { planTimeline } from './live-sessions.generate';

const now = new Date('2026-08-30T00:00:00.000Z');

function block(partial: {
  id: string;
  type: BlockType;
  groupId?: string | null;
  productId?: string | null;
  durationSec?: number;
}) {
  return {
    id: partial.id,
    type: partial.type,
    groupId: partial.groupId ?? null,
    productId: partial.productId ?? null,
    title: `title-${partial.id}`,
    content: `content-${partial.id}`,
    durationSec: partial.durationSec ?? 30,
    weight: 1,
    lastUsedAt: null as Date | null,
    emotions: [{ emotion: { code: 'HAPPY', imageUrl: 'https://cdn.example/emotions/happy.png' } }],
    createdAt: now,
  };
}

describe('planTimeline', () => {
  const productId = '11111111-1111-4111-8111-111111111111';

  const deps = {
    products: [{ id: productId, code: 'SP001', name: 'Nhẫn', attributes: null, images: ['https://cdn.example/products/sp001.jpg'] }],
    openingBlocks: [block({ id: 'open', type: BlockType.OPENING })],
    closingBlocks: [block({ id: 'close', type: BlockType.CLOSING })],
    ctaBlocks: [block({ id: 'cta', type: BlockType.CTA, groupId: 'g1' })],
    gameBlocks: [block({ id: 'game', type: BlockType.GAME })],
    productBlocks: [
      block({ id: 'story', type: BlockType.STORY, productId, durationSec: 40 }),
    ],
  };

  it('keeps user slot order and skips missing CTA/GAME', () => {
    const actual = planTimeline(
      [
        { kind: SegmentKind.OPENING, plannedSec: 60 },
        { kind: SegmentKind.PRODUCT, productId, plannedSec: 300 },
        { kind: SegmentKind.PRODUCT, productId, plannedSec: 300 },
        { kind: SegmentKind.CLOSING, plannedSec: 60 },
      ],
      deps,
    );

    expect(actual.segments.map((segment) => segment.kind)).toEqual([
      SegmentKind.OPENING,
      SegmentKind.PRODUCT,
      SegmentKind.PRODUCT,
      SegmentKind.CLOSING,
    ]);
  });

  it('allows CTA and GAME right after opening', () => {
    const actual = planTimeline(
      [
        { kind: SegmentKind.OPENING, plannedSec: 60 },
        { kind: SegmentKind.CTA, plannedSec: 45 },
        { kind: SegmentKind.GAME, plannedSec: 90 },
        { kind: SegmentKind.PRODUCT, productId, plannedSec: 300 },
        { kind: SegmentKind.CLOSING, plannedSec: 60 },
      ],
      deps,
    );

    expect(actual.segments.map((segment) => segment.kind)).toEqual([
      SegmentKind.OPENING,
      SegmentKind.CTA,
      SegmentKind.GAME,
      SegmentKind.PRODUCT,
      SegmentKind.CLOSING,
    ]);
    expect(actual.segments[2]?.items[0]?.blockId).toBe('game');
    expect(actual.segments[2]?.items[0]?.title).toBe('title-game');
    expect(actual.segments[2]?.items[0]?.emotionImageUrls).toEqual([
      'https://cdn.example/emotions/happy.png',
    ]);
    expect(actual.segments[2]?.items[0]?.content).toBe('content-game');
    expect(actual.segments[3]?.productImageUrl).toBe('https://cdn.example/products/sp001.jpg');
  });
});
