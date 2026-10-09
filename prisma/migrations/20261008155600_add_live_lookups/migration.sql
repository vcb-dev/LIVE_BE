-- CreateEnum
CREATE TYPE "LIVE"."live_lookup_kind" AS ENUM ('SHIFT', 'LIVE_TYPE', 'TEAM', 'CHANNEL');

-- CreateTable
CREATE TABLE "LIVE"."live_lookups" (
    "id" UUID NOT NULL,
    "kind" "LIVE"."live_lookup_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_lookups_kind_name_key" ON "LIVE"."live_lookups"("kind", "name");

-- CreateIndex
CREATE INDEX "live_lookups_kind_idx" ON "LIVE"."live_lookups"("kind");