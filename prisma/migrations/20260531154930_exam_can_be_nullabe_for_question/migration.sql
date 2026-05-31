/*
  Warnings:

  - You are about to drop the column `type` on the `Examination` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_exam_id_fkey";

-- AlterTable
ALTER TABLE "Examination" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "exam_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "Examination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
