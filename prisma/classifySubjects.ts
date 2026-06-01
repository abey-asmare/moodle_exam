import { PrismaClient, Subject } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { keywordSubjectMap } from "./subjectKeywords"; // adjust path if needed

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function getFirstMatchingSubject(text: string, choices: string[]): Subject | null {
  const combined = (text + " " + choices.join(" ")).toLowerCase();

  for (const entry of keywordSubjectMap) {
    for (const keyword of entry.keywords) {
      if (combined.includes(keyword.toLowerCase())) {
        return entry.subject;
      }
    }
  }
  return null;
}

async function main() {
  // Fetch all questions that currently have DATABASE_SYSTEMS (or any subject you want to override)
  // Adjust the where clause as needed. You could also fetch all and re-classify selectively.
  const questions = await prisma.question.findMany({
    where: {
      subject: Subject.DATABASE_SYSTEMS, // default you used
    },
    include: {
      choices: true,
    },
  });

  console.log(`Found ${questions.length} questions to classify.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const q of questions) {
    const choiceTexts = q.choices.map((c) => c.choice_text);
    const newSubject = getFirstMatchingSubject(q.text, choiceTexts);

    if (newSubject && newSubject !== q.subject) {
      await prisma.question.update({
        where: { id: q.id },
        data: { subject: newSubject },
      });
      updatedCount++;
      console.log(`Q${q.id}: "${q.text.slice(0, 60)}..." → ${newSubject}`);
    } else {
      skippedCount++;
    }
  }

  console.log(`\nDone. Updated: ${updatedCount}, Skipped (no match or already correct): ${skippedCount}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());