import type { Emotion } from '@prisma/client';

export interface EmotionResponse {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function mapEmotionToResponse(emotion: Emotion): EmotionResponse {
  return {
    id: emotion.id,
    code: emotion.code,
    name: emotion.name,
    imageUrl: emotion.imageUrl,
    createdAt: emotion.createdAt.toISOString(),
    updatedAt: emotion.updatedAt.toISOString(),
  };
}
