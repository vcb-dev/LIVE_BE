import type { BlockGroup, BlockType } from '@prisma/client';

export interface BlockGroupResponse {
  readonly id: string;
  readonly type: BlockType;
  readonly code: string;
  readonly name: string;
  readonly weight: number;
  readonly sortOrder: number;
  readonly pickCount: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function mapBlockGroupToResponse(group: BlockGroup): BlockGroupResponse {
  return {
    id: group.id,
    type: group.type,
    code: group.code,
    name: group.name,
    weight: group.weight,
    sortOrder: group.sortOrder,
    pickCount: group.pickCount,
    isActive: group.isActive,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}
