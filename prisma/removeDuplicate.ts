import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });



async function deduplicateQuestions() {
  const count = await prisma.question.count();
  console.log(`Total questions in DB: ${count}`);

  const allQuestions = await prisma.question.findMany({
    orderBy: { id: "asc" },
    select: { id: true, text: true, subject: true },
  });

  const seen = new Map<string, number>();
  const duplicateIds: number[] = [];

  for (const q of allQuestions) {
    const key = `${q.text.trim().toLowerCase()}|${q.subject}`;
    if (seen.has(key)) {
      duplicateIds.push(q.id);
    } else {
      seen.set(key, q.id);
    }
  }

  console.log(`Found ${duplicateIds.length} duplicates`);
  if (duplicateIds.length === 0) return;

  for (const qId of duplicateIds) {
    await prisma.question.update({
      where: { id: qId },
      data: { exams: { set: [] } },
    });
  }

  await prisma.question.updateMany({
    where: { id: { in: duplicateIds } },
    data: { answer_id: null },
  });

  await prisma.attemptAnswer.deleteMany({
    where: { question_id: { in: duplicateIds } },
  });

  await prisma.choice.deleteMany({
    where: { question_id: { in: duplicateIds } },
  });

  await prisma.question.deleteMany({
    where: { id: { in: duplicateIds } },
  });

  console.log(`Deleted ${duplicateIds.length} duplicate questions`);
}

async function main() {
  try {
    await deduplicateQuestions();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);