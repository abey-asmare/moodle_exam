// app/api/examinations/shared/answers/route.ts
// Called ONLY when the shared user submits their exam.
// Returns the correct answer_id for each question so the client
// can score and render the review screen.
// There is no sensitive data beyond which choice is correct —
// that's acceptable to reveal post-submission.

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const examId = Number(searchParams.get("exam_id"));

  if (!examId) {
    return NextResponse.json({ error: "exam_id required" }, { status: 400 });
  }

  const exam = await prisma.examination.findUnique({
    where: { id: examId },
    include: { questions: { select: { id: true, answer_id: true } } },
  });

  if (!exam) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Map of questionId -> correctChoiceId
  const answers: Record<number, number | null> = {};
  for (const q of exam.questions) {
    answers[q.id] = q.answer_id;
  }

  return NextResponse.json({ answers });
}