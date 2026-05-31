-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_answer_id_fkey";

-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "answer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "Choice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
