export const EMOTION_IMAGE_MAX_BYTES = 10 * 1024 * 1024

export const EMOTION_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export type EmotionImageMime = (typeof EMOTION_IMAGE_MIMES)[number]

export interface EmotionImageUploadResponse {
  imageUrl: string
}
