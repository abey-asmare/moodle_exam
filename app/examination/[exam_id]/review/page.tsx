import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReviewClient from "./REviewClient";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ exam_id: string }>;
}) {
  const { exam_id } = await params;
  const examId = Number(exam_id);

  const attempt = await prisma.examAttempt.findFirst({
    where: { exam_id: examId, finished_at: { not: null } },
    orderBy: { finished_at: "desc" },
    include: {
      answers: true,
    },
  });

  if (!attempt) notFound();

  const exam = await prisma.examination.findUnique({
    where: { id: examId },
    include: {
      questions: {
        include: { choices: true },
      },
    },
  });

  if (!exam) notFound();

  return (
    <ReviewClient
      exam={{
        id: exam.id,
        title: exam.title,
        questions: exam.questions.map((q) => ({
          id: q.id,
          text: q.text,
          subject: q.subject,
          answer_id: q.answer_id!,
          choices: q.choices.map(({ id, choice_text }) => ({
            id,
            choice_text,
          })),
        })),
      }}
      attempt={{
        id: attempt.id,
        score: attempt.score,
        started_at: attempt.started_at.toISOString(),
        finished_at: attempt.finished_at?.toISOString() ?? null,
        answers: attempt.answers.map((a) => ({
          question_id: a.question_id,
          selected_choice_id: a.selected_choice_id,
          is_correct: a.is_correct,
        })),
      }}
    />
  );
}
