import type { BlockType, Emotion, Prisma, ScriptBlock } from '@prisma/client';

export interface ScriptBlockEmotionResponse {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly imageUrl: string | null;
}

export interface ScriptBlockResponse {
  readonly id: string;
  readonly type: BlockType;
  readonly groupId: string | null;
  readonly groupCode: string | null;
  readonly groupName: string | null;
  readonly productId: string | null;
  readonly productCode: string | null;
  readonly productName: string | null;
  readonly title: string | null;
  readonly content: string;
  readonly durationSec: number;
  readonly weight: number;
  readonly sortOrder: number;
  readonly usageCount: number;
  readonly lastUsedAt: string | null;
  readonly isActive: boolean;
  readonly emotions: ScriptBlockEmotionResponse[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const scriptBlockInclude = {
  group: { select: { id: true, code: true, name: true, type: true } },
  product: { select: { id: true, code: true, name: true } },
  emotions: {
    include: {
      emotion: { select: { id: true, code: true, name: true, imageUrl: true } },
    },
  },
} satisfies Prisma.ScriptBlockInclude;

type ScriptBlockWithRelations = ScriptBlock & {
  group: { id: string; code: string; name: string; type: BlockType } | null;
  product: { id: string; code: string; name: string } | null;
  emotions: Array<{ emotion: Pick<Emotion, 'id' | 'code' | 'name' | 'imageUrl'> }>;
};

function mapEmotionToResponse(
  emotion: Pick<Emotion, 'id' | 'code' | 'name' | 'imageUrl'>,
): ScriptBlockEmotionResponse {
  return {
    id: emotion.id,
    code: emotion.code,
    name: emotion.name,
    imageUrl: emotion.imageUrl,
  };
}

export function mapScriptBlockToResponse(block: ScriptBlockWithRelations): ScriptBlockResponse {
  return {
    id: block.id,
    type: block.type,
    groupId: block.groupId,
    groupCode: block.group?.code ?? null,
    groupName: block.group?.name ?? null,
    productId: block.productId,
    productCode: block.product?.code ?? null,
    productName: block.product?.name ?? null,
    title: block.title,
    content: block.content,
    durationSec: block.durationSec,
    weight: block.weight,
    sortOrder: block.sortOrder,
    usageCount: block.usageCount,
    lastUsedAt: block.lastUsedAt?.toISOString() ?? null,
    isActive: block.isActive,
    emotions: block.emotions.map((row) => mapEmotionToResponse(row.emotion)),
    createdAt: block.createdAt.toISOString(),
    updatedAt: block.updatedAt.toISOString(),
  };
}
