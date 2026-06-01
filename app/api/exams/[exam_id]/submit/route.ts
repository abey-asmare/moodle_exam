import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ exam_id: string }> },
) {
  const { exam_id } = await params;
  const examId = Number(exam_id);

  const body = await req.json();
  const { attempt_id, answers } = body as {
    attempt_id: number;
    answers: Record<string, number | null>;
  };

  // Load full questions including correct answer_id for scoring + review
  // const questions = await prisma.question.findMany({
  //   where: { exam_id: examId },
  //   include: { choices: true },
  // });
  const exam = await prisma.examination.findUnique({
    where: { id: examId },
    include: { questions: { include: { choices: true } } },
  });
  const questions = exam?.questions ?? [];

  let score = 0;
  const attemptAnswers = questions.map((q) => {
    const selectedChoiceId = answers[String(q.id)] ?? null;
    const isCorrect =
      selectedChoiceId !== null ? selectedChoiceId === q.answer_id : null;
    if (isCorrect) score++;
    return {
      question_id: q.id,
      selected_choice_id: selectedChoiceId,
      is_correct: isCorrect,
    };
  });

  const updatedAttempt = await prisma.examAttempt.update({
    where: { id: attempt_id },
    data: {
      finished_at: new Date(),
      score,
      answers: {
        createMany: { data: attemptAnswers, skipDuplicates: true },
      },
    },
    include: { answers: true },
  });

  // Return questions WITH answer_id so client can render review screen correctly
  return NextResponse.json({
    attempt: updatedAttempt,
    questions, // includes answer_id — safe to reveal after submission
  });
}
