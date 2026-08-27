export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024

export const PRODUCT_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export type ProductImageMime = (typeof PRODUCT_IMAGE_MIMES)[number]

export interface ProductImageUploadResponse {
  imageUrl: string
}
