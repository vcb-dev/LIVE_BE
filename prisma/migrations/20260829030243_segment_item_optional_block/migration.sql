-- DropForeignKey
ALTER TABLE "segment_items" DROP CONSTRAINT "segment_items_block_id_fkey";

-- AlterTable
ALTER TABLE "segment_items" ALTER COLUMN "block_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "segment_items" ADD CONSTRAINT "segment_items_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "script_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
