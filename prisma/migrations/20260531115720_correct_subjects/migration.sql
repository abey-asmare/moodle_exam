/*
  Warnings:

  - The values [DATABASE] on the enum `Subject` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Subject_new" AS ENUM ('PROGRAMMING', 'DATA_STRUCTURES_ALGORITHMS', 'OOP', 'WEB_PROGRAMMING', 'MOBILE_DEVELOPMENT', 'DATABASE_SYSTEMS', 'OPERATING_SYSTEMS', 'SOFTWARE_ENGINEERING', 'REQUIREMENTS_ENGINEERING', 'ARCHITECTURE_DESIGN', 'PROJECT_MANAGEMENT', 'TESTING_QA', 'EVOLUTION_MAINTENANCE', 'NETWORKING', 'AI_ML');
ALTER TABLE "Question" ALTER COLUMN "subject" TYPE "Subject_new" USING ("subject"::text::"Subject_new");
ALTER TYPE "Subject" RENAME TO "Subject_old";
ALTER TYPE "Subject_new" RENAME TO "Subject";
DROP TYPE "public"."Subject_old";
COMMIT;
