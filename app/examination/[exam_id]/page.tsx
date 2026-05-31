// app/examination/[exam_id]/page.tsx
// Server component: fetches the exam (including is_flagged per question),
// then hands off to ExamClient.

import prisma from "@/lib/prisma";
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

  // Strip answer_id, keep is_flagged for restoring flag state on the client
  const safeExam = {
    id: exam.id,
    title: exam.title,
    questions: exam.questions.map(({ answer_id, ...q }) => ({
      ...q,
      subject: q.subject as any,
      choices: q.choices.map(({ question_id, ...c }) => c),
    })),
  };

  return <ExamClient exam={safeExam} examId={examId} totalTime={TOTAL_TIME} />;
}
