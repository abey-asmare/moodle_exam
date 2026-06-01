/*
  Warnings:

  - You are about to drop the column `exam_id` on the `Question` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_exam_id_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "exam_id";

-- CreateTable
CREATE TABLE "_ExaminationToQuestion" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ExaminationToQuestion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ExaminationToQuestion_B_index" ON "_ExaminationToQuestion"("B");

-- AddForeignKey
ALTER TABLE "_ExaminationToQuestion" ADD CONSTRAINT "_ExaminationToQuestion_A_fkey" FOREIGN KEY ("A") REFERENCES "Examination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExaminationToQuestion" ADD CONSTRAINT "_ExaminationToQuestion_B_fkey" FOREIGN KEY ("B") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
