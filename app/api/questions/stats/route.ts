import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const [bySubject, answered, flagged] = await Promise.all([
    prisma.question.groupBy({
      by: ["subject"],
      _count: { id: true },
    }),
    prisma.attemptAnswer.findMany({
      where: { selected_choice_id: { not: null } },
      select: { question_id: true, is_correct: true },
      distinct: ["question_id"],
    }),
    prisma.question.count({ where: { is_flagged: true } }),
  ]);

  const totalQuestions = bySubject.reduce((a, b) => a + b._count.id, 0);
  const answeredCount = answered.length;
  const correctCount = answered.filter((a) => a.is_correct === true).length;

  return NextResponse.json({
    total: totalQuestions,
    answered: answeredCount,
    correct: correctCount,
    flagged,
    by_subject: bySubject.map((r) => ({
      subject: r.subject,
      count: r._count.id,
    })),
  });
}