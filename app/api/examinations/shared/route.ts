// Public endpoint — returns exam questions WITHOUT answer_id.
// Called only by the shared (public) ExamClient.

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
    include: {
      questions: {
        include: { choices: true },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Strip answer_id — friends must not see the answer until they submit
  const safeExam = {
    id: exam.id,
    title: exam.title,
    questions: exam.questions.map((q) => ({
      id: q.id,
      text: q.text,
      subject: q.subject,
      choices: q.choices.map(({ id, choice_text }) => ({ id, choice_text })),
      // answer_id intentionally omitted here
    })),
  };

  return NextResponse.json(safeExam);
}
