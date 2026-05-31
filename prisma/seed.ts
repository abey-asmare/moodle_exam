import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient, Subject, Type } from "../app/generated/prisma/client";
import questions from "./questions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const q of questions) {
    // Create the question (exam_id is null, to be linked later)
    const question = await prisma.question.create({
      data: {
        text: q.text,
        subject: q.subject as Subject,
        type: Type.MODEL,
        year: 2019,
        from: null,
        is_flagged: false,
      },
    });

    // Create the four choices
    const choices = await Promise.all(
      q.choices.map((choiceText) =>
        prisma.choice.create({
          data: { choice_text: choiceText, question_id: question.id },
        }),
      ),
    );

    // Link the correct answer
    const correctChoice = choices[q.correctIndex];
    await prisma.question.update({
      where: { id: question.id },
      data: { answer_id: correctChoice.id },
    });
  }

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
