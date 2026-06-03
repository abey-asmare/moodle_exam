import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient, Subject, Type } from "../app/generated/prisma/client";
import questions from "./questions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$transaction(
    async (tx) => {
      for (const q of questions) {
        const question = await tx.question.create({
          data: {
            text: q.text,
            subject: q.subject as Subject,
            type: Type.MODEL,
            year: q.year ?? 2019,
            from: q.from ?? null,
            is_flagged: false,
          },
        });

        const choices = await Promise.all(
          q.choices.map((choiceText) =>
            tx.choice.create({
              data: { choice_text: choiceText, question_id: question.id },
            })
          )
        );

        const correctChoice = choices[q.correctIndex];
        await tx.question.update({
          where: { id: question.id },
          data: { answer_id: correctChoice.id },
        });
      }
    },
    { timeout: 60000 * 10 }// 10min
  );

  console.log(`✅ Seeded ${questions.length} questions successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });