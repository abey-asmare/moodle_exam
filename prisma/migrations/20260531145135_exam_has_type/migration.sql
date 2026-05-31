-- 1. Add the column using the OLD enum type
ALTER TABLE "Question" ADD COLUMN "type" "Type" NOT NULL DEFAULT 'MODEL';

-- 2. Drop defaults on ALL columns using the old enum before renaming
BEGIN;
CREATE TYPE "Type_new" AS ENUM ('MODEL', 'EXIT');

ALTER TABLE "public"."Examination" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Question" ALTER COLUMN "type" DROP DEFAULT;  -- ← add this

ALTER TABLE "public"."Examination" ALTER COLUMN "type" TYPE "Type_new" USING ("type"::text::"Type_new");
ALTER TABLE "Question" ALTER COLUMN "type" TYPE "Type_new" USING ("type"::text::"Type_new");

DROP TYPE "Type";
ALTER TYPE "Type_new" RENAME TO "Type";
COMMIT;

-- 3. Restore defaults
ALTER TABLE "public"."Examination" ALTER COLUMN "type" SET DEFAULT 'MODEL';
ALTER TABLE "Question" ALTER COLUMN "type" SET DEFAULT 'MODEL';