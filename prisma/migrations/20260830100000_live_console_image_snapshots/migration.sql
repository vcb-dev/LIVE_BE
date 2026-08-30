-- AlterTable
ALTER TABLE "session_segments" ADD COLUMN "product_image_url" TEXT;

-- AlterTable
ALTER TABLE "segment_items" ADD COLUMN "emotion_image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
