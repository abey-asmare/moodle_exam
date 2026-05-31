// app/api/exams/[exam_id]/route.ts
// Returns the exam with questions (answer_id stripped for security).
// is_flagged is included so the client can restore flag state on load.

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ exam_id: string }> },
) {
  const { exam_id } = await params;

  const exam = await prisma.examination.findUnique({
    where: { id: Number(exam_id) },
    include: {
      questions: {
        include: {
          choices: true,
        },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  // Strip answer_id from each question before sending to client
  const safeExam = {
    ...exam,
    questions: exam.questions.map(({ answer_id, ...q }) => q),
  };

  return NextResponse.json(safeExam);
}