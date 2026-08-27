/*
  Warnings:

  - You are about to drop the column `speech_rate` on the `live_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `word_count` on the `script_blocks` table. All the data in the column will be lost.
  - Added the required column `kind` to the `session_segments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "segment_kind" AS ENUM ('OPENING', 'PRODUCT', 'INTERLUDE', 'CLOSING');

-- AlterTable
ALTER TABLE "live_sessions" DROP COLUMN "speech_rate";

-- AlterTable
ALTER TABLE "script_blocks" DROP COLUMN "word_count";

-- AlterTable
-- DEFAULT tạm rồi bỏ ngay, để câu lệnh chạy được cả khi bảng đã có dữ liệu.
ALTER TABLE "session_segments" ADD COLUMN     "kind" "segment_kind" NOT NULL DEFAULT 'PRODUCT';
ALTER TABLE "session_segments" ALTER COLUMN "kind" DROP DEFAULT;

-- Tìm kiếm toàn văn cho kho nội dung (~250k dòng).
-- Migration trước tạo search_vector thành cột tsvector thường nên nó luôn NULL và
-- không có index. Dựng lại thành cột generated do Postgres tự tính, kèm index GIN.
-- Postgres không có từ điển tiếng Việt nên dùng cấu hình 'simple' + unaccent:
-- tìm được không dấu, nhưng không hiểu biến thể từ.
-- Supabase để extension ở schema "extensions"; shadow database của Prisma thì trắng
-- nên phải tự tạo. Trên DB thật câu lệnh này là no-op.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- unaccent() là STABLE (phụ thuộc từ điển) nên Postgres không cho dùng trực tiếp
-- trong cột generated. Bọc lại thành IMMUTABLE bằng dạng 2 tham số chỉ đích danh
-- từ điển, cách xử lý tiêu chuẩn cho trường hợp này.
-- ponytail: nếu sau này sửa từ điển unaccent thì phải REINDEX script_blocks_search_idx.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  STRICT
AS $$ SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

ALTER TABLE "script_blocks" DROP COLUMN "search_vector";

ALTER TABLE "script_blocks"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', public.immutable_unaccent(coalesce("title", '') || ' ' || "content"))
  ) STORED;

CREATE INDEX "script_blocks_search_idx" ON "script_blocks" USING GIN ("search_vector");
