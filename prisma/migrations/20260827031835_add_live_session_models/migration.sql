-- CreateEnum
CREATE TYPE "block_type" AS ENUM ('OPENING', 'PRODUCT_SPEC', 'STORY', 'MEANING', 'CTA', 'GAME', 'CLOSING');

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'FINISHED');

-- CreateEnum
CREATE TYPE "item_status" AS ENUM ('PENDING', 'ACTIVE', 'DONE', 'SKIPPED');

-- CreateTable
CREATE TABLE "emotions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_emotions" (
    "block_id" UUID NOT NULL,
    "emotion_id" UUID NOT NULL,

    CONSTRAINT "block_emotions_pkey" PRIMARY KEY ("block_id","emotion_id")
);

-- CreateTable
CREATE TABLE "block_groups" (
    "id" UUID NOT NULL,
    "type" "block_type" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "pick_count" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" UUID,
    "attributes" JSONB,
    "description" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video_url" TEXT,
    "sapo_id" TEXT,
    "sapo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT,
    "price" DECIMAL(12,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_blocks" (
    "id" UUID NOT NULL,
    "type" "block_type" NOT NULL,
    "group_id" UUID,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "product_id" UUID,
    "category_id" UUID,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "planned_sec" INTEGER NOT NULL,
    "status" "session_status" NOT NULL DEFAULT 'DRAFT',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "host_id" UUID,
    "speech_rate" DECIMAL(4,2) NOT NULL DEFAULT 2.5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_segments" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "product_id" UUID,
    "position" INTEGER NOT NULL,
    "planned_sec" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_items" (
    "id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "block_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "block_type" NOT NULL,
    "content" TEXT NOT NULL,
    "emotion_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "planned_sec" INTEGER NOT NULL,
    "status" "item_status" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "segment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emotions_code_key" ON "emotions"("code");

-- CreateIndex
CREATE INDEX "block_emotions_emotion_id_idx" ON "block_emotions"("emotion_id");

-- CreateIndex
CREATE UNIQUE INDEX "block_groups_type_code_key" ON "block_groups"("type", "code");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sapo_id_key" ON "products"("sapo_id");

-- CreateIndex
CREATE INDEX "products_category_id_is_active_idx" ON "products"("category_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "script_blocks_product_id_type_is_active_idx" ON "script_blocks"("product_id", "type", "is_active");

-- CreateIndex
CREATE INDEX "script_blocks_category_id_type_is_active_idx" ON "script_blocks"("category_id", "type", "is_active");

-- CreateIndex
CREATE INDEX "script_blocks_type_group_id_is_active_last_used_at_idx" ON "script_blocks"("type", "group_id", "is_active", "last_used_at");

-- CreateIndex
CREATE INDEX "live_sessions_status_scheduled_at_idx" ON "live_sessions"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "session_segments_session_id_position_key" ON "session_segments"("session_id", "position");

-- CreateIndex
CREATE INDEX "segment_items_segment_id_status_idx" ON "segment_items"("segment_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "segment_items_segment_id_position_key" ON "segment_items"("segment_id", "position");

-- AddForeignKey
ALTER TABLE "block_emotions" ADD CONSTRAINT "block_emotions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "script_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_emotions" ADD CONSTRAINT "block_emotions_emotion_id_fkey" FOREIGN KEY ("emotion_id") REFERENCES "emotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_blocks" ADD CONSTRAINT "script_blocks_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "block_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_blocks" ADD CONSTRAINT "script_blocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_blocks" ADD CONSTRAINT "script_blocks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_items" ADD CONSTRAINT "segment_items_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "session_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_items" ADD CONSTRAINT "segment_items_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "script_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
