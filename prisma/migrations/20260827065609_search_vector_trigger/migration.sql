-- Chuyển search_vector từ cột generated sang cột thường + trigger.
-- Prisma không mô hình hoá được cột generated nên mỗi lần chạy `prisma migrate dev`
-- nó lại đòi sinh migration để xoá biểu thức sinh; sớm muộn sẽ có người bấm đồng ý
-- và mất index tìm kiếm. Trigger thì Prisma không đụng tới.

DROP INDEX IF EXISTS "script_blocks_search_idx";

ALTER TABLE "script_blocks" DROP COLUMN "search_vector";
ALTER TABLE "script_blocks" ADD COLUMN "search_vector" tsvector;

-- 'simple' vì Postgres không có từ điển tiếng Việt; unaccent để tìm được cả khi
-- người dùng gõ không dấu. Trigger gọi thẳng unaccent() được, không cần hàm bọc
-- IMMUTABLE như khi dùng cột generated.
CREATE OR REPLACE FUNCTION public.script_blocks_search_vector_update()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple',
    extensions.unaccent(coalesce(NEW.title, '') || ' ' || NEW.content)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER script_blocks_search_vector_tg
  BEFORE INSERT OR UPDATE OF "title", "content" ON "script_blocks"
  FOR EACH ROW
  EXECUTE FUNCTION public.script_blocks_search_vector_update();

-- Điền cho các dòng đã có (hiện bảng rỗng, nhưng migration phải đúng ở mọi môi trường).
UPDATE "script_blocks" SET "title" = "title";

DROP FUNCTION IF EXISTS public.immutable_unaccent(text);

CREATE INDEX "script_blocks_search_vector_idx" ON "script_blocks" USING GIN ("search_vector");
