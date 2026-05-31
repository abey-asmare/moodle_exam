import { PrismaClient, Subject, Type } from "../app/generated/prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // 1. Create the exam
  const exam = await prisma.examination.create({
    data: {
      title: "Exit Exam Model Questions",
      type: Type.MODEL,
    },
  });

  // ------------------------------------------------------------
  // Helper types
  type ChoiceInput = { text: string };
  type QuestionInput = {
    text: string;
    subject: Subject;
    from?: string;
    choices: ChoiceInput[];
    correctIndex: number; // 0‑based
  };

  // ------------------------------------------------------------
  // All questions to seed
  const questions: QuestionInput[] = [
    // ----- Chapter 1: Query Processing and Optimization -----
    {
      text: "refers to the range of activities involved in extracting data from a database.",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "Query processing" },
        { text: "Storage management" },
        { text: "DBMS" },
        { text: "Evaluation plan" },
      ],
      correctIndex: 0,
    },
    {
      text: "In the query processor applies rules to the internal data structures of the query to transform these structures into equivalent, but more efficient representations.",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "Decomposition" },
        { text: "Optimization" },
        { text: "Evaluation" },
        { text: "All" },
      ],
      correctIndex: 1,
    },
    {
      text: "The aims of are to transform a high-level query into a relational algebra query",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "Decomposition" },
        { text: "Optimization" },
        { text: "Evaluation" },
        { text: "All" },
      ],
      correctIndex: 0,
    },
    {
      text: "identifies the language tokens that appear in the text of the query.",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "Scanner" },
        { text: "Parser" },
        { text: "Validate" },
        { text: "None" },
      ],
      correctIndex: 0,
    },
    {
      text: "checks the query syntax to determine whether it is formulated according to the syntax rules of the query language.",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "Scanner" },
        { text: "Parser" },
        { text: "Validate" },
        { text: "None" },
      ],
      correctIndex: 1,
    },

    // ----- Chapter 2: Transaction Management and Concurrency Control -----
    {
      text: "which one of the following is not true about transaction?",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "A transaction is a unit of program under execution." },
        { text: "It is either completed in its entirety or not done at all." },
        { text: "It includes one or more database access operations." },
        { text: "None of the above" },
      ],
      correctIndex: 3,
    },
    {
      text: "is the process of managing simultaneous operations on the database without having them interfere with one another.",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "Database recovery" },
        { text: "Concurrency control" },
        { text: "Serializability" },
        { text: "Non serial schedule" },
      ],
      correctIndex: 1,
    },
    {
      text: "The problem occurs when two concurrent transactions, T1 and T2, are updating the same data element and one of the updates is overwritten by the other transaction.",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "Lost updates" },
        { text: "Uncommitted data" },
        { text: "Inconsistent retrievals" },
        { text: "Unrepeatable Read Problem" },
      ],
      correctIndex: 0,
    },
    {
      text: "occur when a transaction accesses data before and after another transaction(s) finish working with such data.",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "Lost updates" },
        { text: "Uncommitted data" },
        { text: "Inconsistent retrievals" },
        { text: "Unrepeatable Read Problem" },
      ],
      correctIndex: 2,
    },
    {
      text: "Which one of the following is used to define schedule are equivalence?",
      subject: "DATABASE_SYSTEMS",
      choices: [
        { text: "Initial Reads" },
        { text: "W-R Conflict" },
        { text: "Final Write" },
        { text: "All" },
      ],
      correctIndex: 3,
    },

    // ... follow the same pattern for every question: set "from": null

    // Last question example:
    {
      text: "What is the purpose of an incident response plan?",
      subject: "NETWORKING",
      choices: [
        { text: "To prevent incidents from occurring" },
        { text: "To minimize the impact of incidents" },
        { text: "To ensure that incidents are reported quickly" },
        { text: "To identify the root cause of incidents" },
      ],
      correctIndex: 1,
    },
  ];

  // 2. Create all questions with choices (parallel, no transaction)
  await Promise.all(
    questions.map((q) =>
      prisma.question.create({
        data: {
          text: q.text,
          subject: q.subject,
          from: q.from,
          exam_id: exam.id,
          choices: {
            create: q.choices.map((c) => ({ choice_text: c.text })),
          },
        },
      }),
    ),
  );

  // 3. Fetch created questions with choices
  const createdQuestions = await prisma.question.findMany({
    where: { exam_id: exam.id },
    include: { choices: true },
  });

  // 4. Update each question with the correct answer
  const updates = createdQuestions.map((createdQ, idx) => {
    const inputQ = questions[idx];
    const correctChoice = createdQ.choices[inputQ.correctIndex];
    return prisma.question.update({
      where: { id: createdQ.id },
      data: { answer_id: correctChoice.id },
    });
  });

  await Promise.all(updates);

  console.log(`Seeding complete: ${questions.length} questions created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
