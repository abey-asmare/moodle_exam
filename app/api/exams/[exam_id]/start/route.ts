// app/api/exams/[exam_id]/start/route.ts
// Always wipe previous attempts for this exam before creating a fresh one.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ exam_id: string }> },
) {
  const { exam_id } = await params;
  const examId = Number(exam_id);

  const exam = await prisma.examination.findUnique({
    where: { id: examId },
    include: { questions: true },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  // Wipe all previous attempts (and their answers via cascade) for this exam.
  // This keeps the DB clean and makes "attempted / unattempted" tracking trivial —
  // an exam is unattempted iff it has no ExamAttempt with finished_at != null.
  const previousAttempts = await prisma.examAttempt.findMany({
    where: { exam_id: examId },
    select: { id: true },
  });

  if (previousAttempts.length > 0) {
    const ids = previousAttempts.map((a) => a.id);
    await prisma.attemptAnswer.deleteMany({ where: { attempt_id: { in: ids } } });
    await prisma.examAttempt.deleteMany({ where: { id: { in: ids } } });
  }

  const attempt = await prisma.examAttempt.create({
    data: {
      exam_id: examId,
      started_at: new Date(),
    },
  });

  return NextResponse.json({ attempt });
}