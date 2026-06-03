import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function deduplicateQuestions() {
  console.log("Fetching all questions with choices...");
  const all = await prisma.question.findMany({
    select: {
      id: true,
      text: true,
      subject: true,
      year: true,
      choices: {
        select: { choice_text: true },
        orderBy: { choice_text: "asc" }, // stable order for comparison
      },
    },
    orderBy: { id: "asc" },
  });

  // Key = normalized text + subject + sorted choice texts
  // Two questions are duplicates only if ALL of these match
  const groups = new Map<string, { id: number; year: number | null }[]>();

  for (const q of all) {
    const choiceKey = q.choices
      .map((c) => c.choice_text.trim().toLowerCase())
      .sort()
      .join("||");

    const key = `${q.text.trim().toLowerCase()}|${q.subject}|${choiceKey}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ id: q.id, year: q.year });
  }

  const deleteIds: number[] = [];

  for (const [, items] of groups) {
    if (items.length === 1) continue;

    // Keep the one with the highest year (latest); on tie keep highest id
    items.sort((a, b) => {
      const yA = a.year ?? 0;
      const yB = b.year ?? 0;
      if (yA !== yB) return yB - yA; // descending year → winner first
      return b.id - a.id;            // descending id → winner first
    });

    const [, ...dupes] = items;
    deleteIds.push(...dupes.map((d) => d.id));
  }

  if (deleteIds.length === 0) {
    console.log("No duplicate questions found.");
    return;
  }

  console.log(`Found ${deleteIds.length} duplicate(s) to delete.`);

  await prisma.$transaction([
    prisma.attemptAnswer.deleteMany({
      where: { question_id: { in: deleteIds } },
    }),
    prisma.choice.deleteMany({
      where: { question_id: { in: deleteIds } },
    }),
    prisma.question.deleteMany({
      where: { id: { in: deleteIds } },
    }),
  ]);

  console.log("Duplicates removed successfully.");
}

async function main() {
  try {
    await deduplicateQuestions();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);