-- CreateEnum
CREATE TYPE "Type" AS ENUM ('MODEL', 'EXIT');

-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('FOP', 'DSA', 'OOP', 'WEB', 'MAD', 'DBMS', 'OS', 'SE', 'SRE', 'SAD', 'SPM', 'STQA', 'SEM', 'NSS', 'AI_ML');

-- CreateTable
CREATE TABLE "Choice" (
    "id" SERIAL NOT NULL,
    "choice_text" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "answer_id" INTEGER NOT NULL,
    "user_answer_id" INTEGER,
    "year" INTEGER NOT NULL DEFAULT 2019,
    "type" "Type" NOT NULL DEFAULT 'MODEL',
    "from" TEXT NOT NULL,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "subject" "Subject" NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "Choice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_user_answer_id_fkey" FOREIGN KEY ("user_answer_id") REFERENCES "Choice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
