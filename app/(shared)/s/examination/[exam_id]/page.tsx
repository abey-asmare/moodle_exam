// app/(shared)/examination/[exam_id]/page.tsx
// Server component for the public/shared exam route.
// Fetches questions WITHOUT answer_id — answers are revealed client-side
// only after the user submits, using data stored in localStorage.

import { TOTAL_TIME } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SharedExamClient } from "./SharedExamClient";

export default async function SharedExamPage({
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

  // Strip answer_id — we reveal correct answers client-side after submit,
  // sourcing them from a separate /api/examinations/shared/answers endpoint
  // called only at submission time.
  const safeExam = {
    id: exam.id,
    title: exam.title,
    questions: exam.questions.map((q) => ({
      id: q.id,
      text: q.text,
      subject: q.subject,
      choices: q.choices.map(({ id, choice_text }) => ({ id, choice_text })),
    })),
  };

  return (
    <SharedExamClient exam={safeExam} examId={examId} totalTime={TOTAL_TIME} />
  );
}
