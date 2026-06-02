// app/examination/[exam_id]/page.tsx
// Server component: fetches the exam (including is_flagged per question),
// then hands off to ExamClient.

import prisma from "@/lib/prisma";
import { Subject } from "@/lib/types";
import { notFound } from "next/navigation";
import { ExamClient } from "./ExamClient";

const TOTAL_TIME = 1 * 60 * 60 + 40 * 60; // 1 hour and 40 minutes in seconds

export default async function ExamPage({
  params,
}: {
  params: Promise<{ exam_id: string }>;
}) {
  const { exam_id } = await params;
  const examId = Number(exam_id);

  const exam = await prisma.examination.findUnique({
    where: { id: examId },
    include: {
      questions: {
        include: { choices: true },
      },
    },
  });

  if (!exam) notFound();

  const safeExam = {
    id: exam.id,
    title: exam.title,
    questions: exam.questions.map((q) => ({
      id: q.id,
      text: q.text,
      subject: q.subject as Subject,
      is_flagged: q.is_flagged,
      choices: q.choices.map(({ id, choice_text }) => ({ id, choice_text })),
    })),
  };

  return <ExamClient exam={safeExam} examId={examId} totalTime={TOTAL_TIME} />;
}
