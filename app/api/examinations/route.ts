import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const exams = await prisma.examination.findMany({
    include: {
      _count: { select: { questions: true } },
      attempts: {
        orderBy: { started_at: "desc" },
        take: 1,
        select: {
          id: true,
          score: true,
          finished_at: true,
          started_at: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const result = exams.map((exam) => {
    const lastAttempt = exam.attempts[0] ?? null;
    return {
      id: exam.id,
      title: exam.title,
      type: exam.type,
      question_count: exam._count.questions,
      last_attempt: lastAttempt
        ? {
            id: lastAttempt.id,
            score: lastAttempt.score,
            finished_at: lastAttempt.finished_at,
            started_at: lastAttempt.started_at,
          }
        : null,
    };
  });

  return NextResponse.json(result);
}