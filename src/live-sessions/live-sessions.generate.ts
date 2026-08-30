import { BadRequestException } from '@nestjs/common';
import { BlockType, Prisma, SegmentKind } from '@prisma/client';
import type { SessionSlotDto } from './dto/session-slot.dto';
import { pickWeighted, preferUnused } from './pick-block';
import { productVars, renderPlaceholders } from './render-placeholders';

export type GenerateSlot = SessionSlotDto;

interface BlockRow {
  id: string;
  type: BlockType;
  groupId: string | null;
  productId: string | null;
  title: string | null;
  content: string;
  durationSec: number;
  weight: number;
  lastUsedAt: Date | null;
  emotions: Array<{ emotion: { code: string; imageUrl: string | null } }>;
}

interface PlannedItem {
  blockId: string | null;
  type: BlockType;
  title: string | null;
  content: string;
  emotionCodes: string[];
  emotionImageUrls: string[];
  plannedSec: number;
}

function snapshotTitle(block: BlockRow): string | null {
  const trimmed = block.title?.trim();
  return trimmed || null;
}

export interface PlannedSegment {
  kind: SegmentKind;
  productId: string | null;
  productImageUrl: string | null;
  plannedSec: number;
  items: PlannedItem[];
}

function emotionCodesOf(block: BlockRow): string[] {
  return block.emotions.map((row) => row.emotion.code);
}

function emotionImageUrlsOf(block: BlockRow): string[] {
  return block.emotions
    .map((row) => row.emotion.imageUrl?.trim())
    .filter((url): url is string => Boolean(url));
}

/**
 * Hàm này để tạo item từ block
 * @param block block
 * @param options options của item
 * @returns item
 */
function plannedItemFromBlock(
  block: BlockRow,
  options: { content: string; plannedSec: number },
): PlannedItem {
  return {
    blockId: block.id,
    type: block.type,
    title: snapshotTitle(block),
    content: options.content,
    emotionCodes: emotionCodesOf(block),
    emotionImageUrls: emotionImageUrlsOf(block),
    plannedSec: options.plannedSec,
  };
}

function productImageUrlOf(product: { images: string[] }): string | null {
  const url = product.images[0]?.trim();
  return url || null;
}

/**
 * Hàm này để chọn block từ pool
 * @param pool pool của các blocks
 * @returns block được chọn
 */
function pickBlock(pool: BlockRow[]): BlockRow | undefined {
  // Chọn block từ pool
  return pickWeighted(preferUnused(pool));
}

/**
 * Hàm này để pack blocks
 * @param pool pool của các blocks
 * @param budgetSec thời lượng của blocks
 * @param vars biến của blocks
 * @returns items của blocks
 */
function packBlocks(
  pool: BlockRow[],
  budgetSec: number,
  vars?: Record<string, string>,
): PlannedItem[] {
  const items: PlannedItem[] = [];
  // Set để lưu trữ các blockId còn lại trong pool
  const remainingIds = new Set(pool.map((block) => block.id));
  // Số lượng thời lượng đã sử dụng
  let used = 0;

  // Duyệt qua các blocks còn lại trong pool
  while (remainingIds.size > 0) {
    // Lấy các blocks còn lại trong pool
    const candidates = pool.filter(
      (block) => remainingIds.has(block.id) && used + block.durationSec <= budgetSec,
    );
    // Chọn block từ pool
    const picked = pickBlock(candidates);
    // Nếu không chọn được block thì break
    if (!picked) break;
    // Xóa blockId khỏi set
    remainingIds.delete(picked.id);
    // Thêm thời lượng của block vào số lượng thời lượng đã sử dụng
    used += picked.durationSec;
    // Thêm block vào items
    items.push(
      plannedItemFromBlock(picked, {
        content: vars ? renderPlaceholders(picked.content, vars) : picked.content,
        plannedSec: picked.durationSec,
      }),
    );
  }

  if (items.length === 0) {
    // Nếu không chọn được block thì chọn block ngẫu nhiên từ pool
    const fallback = pickBlock(pool);
    if (!fallback) return [];
    items.push(
      plannedItemFromBlock(fallback, {
        content: vars ? renderPlaceholders(fallback.content, vars) : fallback.content,
        plannedSec: Math.min(fallback.durationSec, budgetSec),
      }),
    );
  }

  return items;
}
/**
 * Hàm này để fill product
 * @param product sản phẩm
 * @param plannedSec thời lượng của product
 * @param blocks blocks của product
 * @returns items của product
 */
function fillProduct(
  product: {
    id: string;
    code: string;
    name: string;
    attributes: Prisma.JsonValue;
    images: string[];
  },
  plannedSec: number,
  blocks: BlockRow[],
): PlannedItem[] {
  const vars = productVars(product);
  // Lấy các blocks theo type
  const byType = (type: BlockType): BlockRow[] =>
    blocks.filter((block) => block.type === type && block.productId === product.id);

  // Thứ tự các blocks
  const order: BlockType[] = [BlockType.PRODUCT_SPEC, BlockType.STORY, BlockType.MEANING];
  const items: PlannedItem[] = [];
  // Số lần sử dụng của các blocks
  let used = 0;

  for (const type of order) {
    const pool = byType(type);
    if (pool.length === 0) continue;
    const picked = pickBlock(pool);
    if (!picked) continue;
    if (used + picked.durationSec > plannedSec && items.length > 0) continue;
    used += picked.durationSec;
    items.push(
      plannedItemFromBlock(picked, {
        content: renderPlaceholders(picked.content, vars),
        plannedSec: picked.durationSec,
      }),
    );
  }

  const extraPool = blocks.filter(
    (block) =>
      block.productId === product.id &&
      (block.type === BlockType.STORY || block.type === BlockType.MEANING) &&
      !items.some((item) => item.blockId === block.id),
  );
  items.push(...packBlocks(extraPool, Math.max(plannedSec - used, 0), vars));

  if (items.length === 0) {
    throw new BadRequestException(
      `Sản phẩm ${product.code} chưa có block thông số / câu chuyện / ý nghĩa`,
    );
  }

  return items;
}

function fillCta(
  ctaBlocks: BlockRow[],
  groupId: string | undefined,
  plannedSec: number,
): PlannedItem[] {
  const pool = groupId ? ctaBlocks.filter((block) => block.groupId === groupId) : ctaBlocks;
  if (pool.length === 0) {
    throw new BadRequestException(
      groupId ? 'Nhóm CTA chưa có nội dung trong kho' : 'Chưa có block CTA trong kho nội dung',
    );
  }

  const items = packBlocks(pool, plannedSec);
  if (items.length === 0) {
    throw new BadRequestException('Không random được CTA');
  }
  return items;
}

function fillGame(gameBlocks: BlockRow[], plannedSec: number): PlannedItem[] {
  if (gameBlocks.length === 0) {
    throw new BadRequestException('Chưa có block trò chơi trong kho nội dung');
  }

  const items = packBlocks(gameBlocks, plannedSec);
  if (items.length === 0) {
    throw new BadRequestException('Không random được trò chơi');
  }
  return items;
}

/**
 * Hàm này để xây dựng plan cho phiên live trả về tổng thời lượng của phiên live và segments của phiên live
 * @param slots slots của phiên live
 * @param deps dependencies của phiên live
 * @returns plan của phiên live
 */
export function planTimeline(
  slots: GenerateSlot[],
  deps: {
    products: Array<{
      id: string;
      code: string;
      name: string;
      attributes: Prisma.JsonValue;
      images: string[];
    }>;
    openingBlocks: BlockRow[];
    closingBlocks: BlockRow[];
    ctaBlocks: BlockRow[];
    gameBlocks: BlockRow[];
    productBlocks: BlockRow[];
  },
): { plannedSec: number; segments: PlannedSegment[] } {
  const productById = new Map(deps.products.map((product) => [product.id, product]));
  const segments: PlannedSegment[] = [];

  for (const slot of slots) {
    if (slot.kind === SegmentKind.OPENING) {
      if (deps.openingBlocks.length === 0) {
        throw new BadRequestException('Chưa có block mở đầu trong kho nội dung');
      }
      segments.push({
        kind: SegmentKind.OPENING,
        productId: null,
        productImageUrl: null,
        plannedSec: slot.plannedSec,
        items: packBlocks(deps.openingBlocks, slot.plannedSec),
      });
      continue;
    }

    if (slot.kind === SegmentKind.CLOSING) {
      if (deps.closingBlocks.length === 0) {
        throw new BadRequestException('Chưa có block kết thúc trong kho nội dung');
      }
      segments.push({
        kind: SegmentKind.CLOSING,
        productId: null,
        productImageUrl: null,
        plannedSec: slot.plannedSec,
        items: packBlocks(deps.closingBlocks, slot.plannedSec),
      });
      continue;
    }

    if (slot.kind === SegmentKind.PRODUCT) {
      if (!slot.productId) {
        throw new BadRequestException('Bước sản phẩm phải chọn sản phẩm');
      }
      const product = productById.get(slot.productId);
      if (!product) {
        throw new BadRequestException('Có sản phẩm không tồn tại hoặc đã tắt');
      }
      segments.push({
        kind: SegmentKind.PRODUCT,
        productId: product.id,
        productImageUrl: productImageUrlOf(product),
        plannedSec: slot.plannedSec,
        items: fillProduct(product, slot.plannedSec, deps.productBlocks),
      });
      continue;
    }

    if (slot.kind === SegmentKind.CTA) {
      segments.push({
        kind: SegmentKind.CTA,
        productId: null,
        productImageUrl: null,
        plannedSec: slot.plannedSec,
        items: fillCta(deps.ctaBlocks, slot.groupId, slot.plannedSec),
      });
      continue;
    }

    if (slot.kind === SegmentKind.GAME) {
      segments.push({
        kind: SegmentKind.GAME,
        productId: null,
        productImageUrl: null,
        plannedSec: slot.plannedSec,
        items: fillGame(deps.gameBlocks, slot.plannedSec),
      });
    }
  }

  const plannedSec = segments.reduce((sum, segment) => sum + segment.plannedSec, 0);
  return { plannedSec, segments };
}
