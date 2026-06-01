import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ exam_id: string }> },
) {
  const { exam_id } = await params;
  const examId = Number(exam_id);

  const attempt = await prisma.examAttempt.findFirst({
    where: { exam_id: examId, finished_at: { not: null } },
    orderBy: { finished_at: "desc" },
    include: {
      answers: {
        include: {
          selected_choice: true,
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json(
      { error: "No completed attempt found for this exam." },
      { status: 404 },
    );
  }

  // const questions = await prisma.question.findMany({
  //   where: { exam_id: examId },
  //   include: { choices: true },
  // });
  const exam = await prisma.examination.findUnique({
  where: { id: examId },
  include: { questions: { include: { choices: true } } },
});
const questions = exam?.questions ?? [];

  return NextResponse.json({ attempt, questions });
}