// app/api/exams/[exam_id]/questions/[question_id]/flag/route.ts
// Toggles Question.is_flagged and returns the new state.

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ exam_id: string; question_id: string }> },
) {
  const { question_id } = await params;
  const questionId = Number(question_id);

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, is_flagged: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: { is_flagged: !question.is_flagged },
    select: { id: true, is_flagged: true },
  });

  return NextResponse.json({ is_flagged: updated.is_flagged });
}
