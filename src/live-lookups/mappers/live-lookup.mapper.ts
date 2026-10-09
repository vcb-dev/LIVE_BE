import type { LiveLookup } from '@prisma/client';

export interface LiveLookupResponse {
  readonly id: string;
  readonly kind: LiveLookup['kind'];
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function mapLiveLookupToResponse(row: LiveLookup): LiveLookupResponse {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
