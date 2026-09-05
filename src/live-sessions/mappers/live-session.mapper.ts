import type {
  BlockType,
  ItemStatus,
  LiveSession,
  Prisma,
  SegmentItem,
  SegmentKind,
  SessionSegment,
  SessionStatus,
} from '@prisma/client';

export interface SegmentItemResponse {
  readonly id: string;
  readonly blockId: string | null;
  readonly position: number;
  readonly type: BlockType;
  readonly title: string | null;
  readonly content: string;
  readonly emotionCodes: string[];
  readonly emotionImageUrls: string[];
  readonly plannedSec: number;
  readonly status: ItemStatus;
}

export interface SessionSegmentResponse {
  readonly id: string;
  readonly kind: SegmentKind;
  readonly productId: string | null;
  readonly productCode: string | null;
  readonly productName: string | null;
  readonly productImageUrl: string | null;
  readonly position: number;
  readonly plannedSec: number;
  readonly items: SegmentItemResponse[];
}

export interface LiveSessionListResponse {
  readonly id: string;
  readonly name: string;
  readonly scheduledAt: string | null;
  readonly plannedSec: number;
  readonly status: SessionStatus;
  readonly productCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LiveSessionDetailResponse extends LiveSessionListResponse {
  readonly openingSec: number;
  readonly closingSec: number;
  readonly interludeSec: number;
  readonly segments: SessionSegmentResponse[];
}

/**
 * Include cho list live session
 */
export const liveSessionListInclude = {
  segments: {
    where: { kind: 'PRODUCT' as const },
    select: { id: true },
  },
} satisfies Prisma.LiveSessionInclude;

/**
 * Include cho detail live session
 */
export const liveSessionDetailInclude = {
  // Include segments: là bảng session_segments
  segments: {
    orderBy: { position: 'asc' as const },
    include: {
      product: { select: { id: true, code: true, name: true } },
      items: { orderBy: { position: 'asc' as const } },
    },
  },
} satisfies Prisma.LiveSessionInclude;

type SessionWithProductCount = LiveSession & { segments: Array<{ id: string }> };

type SessionWithTimeline = LiveSession & {
  segments: Array<
    SessionSegment & {
      product: { id: string; code: string; name: string } | null;
      items: SegmentItem[];
    }
  >;
};

function mapItem(item: SegmentItem): SegmentItemResponse {
  return {
    id: item.id,
    blockId: item.blockId,
    position: item.position,
    type: item.type,
    title: item.title,
    content: item.content,
    emotionCodes: item.emotionCodes,
    emotionImageUrls: item.emotionImageUrls,
    plannedSec: item.plannedSec,
    status: item.status,
  };
}

export function mapLiveSessionToListResponse(
  session: SessionWithProductCount,
): LiveSessionListResponse {
  return {
    id: session.id,
    name: session.name,
    scheduledAt: session.scheduledAt?.toISOString() ?? null,
    plannedSec: session.plannedSec,
    status: session.status,
    productCount: session.segments.length,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function mapLiveSessionToDetailResponse(
  session: SessionWithTimeline,
): LiveSessionDetailResponse {
  /**
   * Tính toán thời lượng mở đầu, đóng cửa và khoảng trống giữa các sản phẩm
   */
  const openingSec =
    session.segments.find((segment) => segment.kind === 'OPENING')?.plannedSec ?? 0;
  const closingSec =
    session.segments.find((segment) => segment.kind === 'CLOSING')?.plannedSec ?? 0;
  const interludeSec =
    session.segments.find(
      (segment) =>
        segment.kind === 'INTERLUDE' || segment.kind === 'CTA' || segment.kind === 'GAME',
    )?.plannedSec ?? 0;

  return {
    ...mapLiveSessionToListResponse({
      ...session,
      segments: session.segments.filter((segment) => segment.kind === 'PRODUCT'),
    }),
    openingSec,
    closingSec,
    interludeSec,
    segments: session.segments.map((segment) => ({
      id: segment.id,
      kind: segment.kind,
      productId: segment.productId,
      productCode: segment.product?.code ?? null,
      productName: segment.product?.name ?? null,
      productImageUrl: segment.productImageUrl,
      position: segment.position,
      plannedSec: segment.plannedSec,
      items: segment.items.map(mapItem),
    })),
  };
}
