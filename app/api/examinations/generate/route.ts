// app/api/examinations/generate/route.ts
//
// Creates an Examination for the requested mode, avoiding questions already
// used in previous *completed* exams of the same mode/type/year.
// When all questions are exhausted the pool resets automatically.
//
// Body shapes:
//   { mode: "random" }
//   { mode: "catalog", type: "MODEL" | "EXIT" }
//   { mode: "year",    type: "MODEL" | "EXIT", year: number }
//   { mode: "hard" }

import { Subject, Type } from "@/app/generated/prisma/client";
import { TOTAL } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const SUBJECTS = Object.values(Subject);

// ── helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function proportionalPick<K>(
  buckets: Map<K, number>,
  total: number,
): Map<K, number> {
  const totalAvailable = Array.from(buckets.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const result = new Map<K, number>();
  let assigned = 0;

  for (const [key, size] of buckets) {
    if (size === 0) continue;
    const share = Math.min(size, Math.round((size / totalAvailable) * total));
    result.set(key, share);
    assigned += share;
  }

  const diff = total - assigned;
  if (diff !== 0) {
    const [biggestKey] = Array.from(buckets.entries()).reduce((a, b) =>
      b[1] > a[1] ? b : a,
    );
    const cur = result.get(biggestKey) ?? 0;
    result.set(biggestKey, Math.max(0, cur + diff));
  }

  return result;
}

/**
 * Returns question IDs that have already appeared in at least one
 * *completed* exam matching the given title prefix (or any exam for random).
 *
 * "Completed" = the exam has at least one attempt with finished_at != null.
 */
async function usedQuestionIds(
  titlePrefix: string | null,
): Promise<Set<number>> {
  // Find completed exams matching the scope
  const completedExams = await prisma.examination.findMany({
    where: {
      ...(titlePrefix ? { title: { startsWith: titlePrefix } } : {}),
      attempts: { some: { finished_at: { not: null } } },
    },
    select: {
      questions: { select: { id: true } },
    },
  });

  const used = new Set<number>();
  for (const exam of completedExams) {
    for (const q of exam.questions) {
      used.add(q.id);
    }
  }
  return used;
}

/**
 * Filter a pool of question IDs by removing already-used ones.
 * If filtering would leave fewer than `minRequired` questions, returns
 * the full pool (reset behaviour).
 */
function filterUsed(
  pool: number[],
  used: Set<number>,
  minRequired: number,
): { ids: number[]; wasReset: boolean } {
  const fresh = pool.filter((id) => !used.has(id));
  if (fresh.length >= minRequired) {
    return { ids: fresh, wasReset: false };
  }
  // Exhausted — reset to full pool
  return { ids: pool, wasReset: true };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json();
  const { mode } = body as { mode: string };

  let questionIds: number[] = [];
  let examTitle: string | undefined;

  // ── MODE: random ────────────────────────────────────────────────────────────
  if (mode === "random") {
    const bySubject = await Promise.all(
      SUBJECTS.map((s) =>
        prisma.question.findMany({
          where: { subject: s },
          select: { id: true },
        }),
      ),
    );

    // Scope: all completed random exams (title = "Random")
    const used = await usedQuestionIds("Random");

    const buckets = new Map<Subject, number[]>();
    SUBJECTS.forEach((s, i) => {
      // Filter used per-subject; reset per-subject when that subject is exhausted
      const all = bySubject[i].map((q) => q.id);
      const fresh = all.filter((id) => !used.has(id));
      // If this subject has fewer fresh than its fair share would need, reset it
      buckets.set(s, fresh.length > 0 ? fresh : all);
    });

    const sizeBuckets = new Map<Subject, number>();
    for (const [s, ids] of buckets) sizeBuckets.set(s, ids.length);

    const picks = proportionalPick(sizeBuckets, TOTAL);
    for (const [s, n] of picks) {
      const ids = buckets.get(s) ?? [];
      questionIds.push(...shuffle([...ids]).slice(0, n));
    }

    if (questionIds.length === 0) {
      return NextResponse.json(
        { error: "No questions found in the database yet." },
        { status: 404 },
      );
    }

    examTitle = "Random";
  }

  // ── MODE: catalog ───────────────────────────────────────────────────────────
  else if (mode === "catalog") {
    const { type } = body as { type: "MODEL" | "EXIT" };
    const label = type === "MODEL" ? "Model" : "Exit";

    const allQuestions = await prisma.question.findMany({
      where: { type: type as Type },
      select: { id: true, subject: true },
    });

    if (allQuestions.length === 0) {
      return NextResponse.json(
        { error: `No ${type} questions found.` },
        { status: 404 },
      );
    }

    // Scope: completed exams whose title starts with "Model " or "Exit "
    const used = await usedQuestionIds(`${label} `);

    const allIds = allQuestions.map((q) => q.id);
    const { ids: freshIds } = filterUsed(allIds, used, TOTAL);

    // Build per-subject buckets from the fresh pool
    const freshSet = new Set(freshIds);
    const buckets = new Map<Subject, number[]>();
    for (const q of allQuestions) {
      if (!freshSet.has(q.id)) continue;
      const list = buckets.get(q.subject) ?? [];
      list.push(q.id);
      buckets.set(q.subject, list);
    }

    const sizeBuckets = new Map<Subject, number>();
    for (const [s, ids] of buckets) sizeBuckets.set(s, ids.length);

    const picks = proportionalPick(
      sizeBuckets,
      Math.min(TOTAL, freshIds.length),
    );
    for (const [s, n] of picks) {
      const ids = buckets.get(s) ?? [];
      questionIds.push(...shuffle([...ids]).slice(0, n));
    }

    examTitle = label; // e.g. "Model" or "Exit" — title set below
  }

  // ── MODE: year ──────────────────────────────────────────────────────────────
  else if (mode === "year") {
    const { type, year } = body as { type: "MODEL" | "EXIT"; year: number };
    const label = type === "MODEL" ? "Model" : "Exit";
    const titleBase = `${label} ${year}`;

    const allForYear = await prisma.question.findMany({
      where: { year, type: type as Type },
      select: { id: true, subject: true },
    });

    if (allForYear.length === 0) {
      return NextResponse.json(
        { error: `No questions found for ${type} ${year}.` },
        { status: 404 },
      );
    }

    // Scope: completed exams for this specific year+type
    const used = await usedQuestionIds(titleBase);

    const allIds = allForYear.map((q) => q.id);
    const { ids: freshIds } = filterUsed(
      allIds,
      used,
      Math.min(TOTAL, allForYear.length),
    );

    const freshSet = new Set(freshIds);
    const buckets = new Map<Subject, number[]>();
    for (const q of allForYear) {
      if (!freshSet.has(q.id)) continue;
      const list = buckets.get(q.subject) ?? [];
      list.push(q.id);
      buckets.set(q.subject, list);
    }

    const sizeBuckets = new Map<Subject, number>();
    for (const [s, ids] of buckets) sizeBuckets.set(s, ids.length);

    const picks = proportionalPick(
      sizeBuckets,
      Math.min(TOTAL, freshIds.length),
    );
    for (const [s, n] of picks) {
      const ids = buckets.get(s) ?? [];
      questionIds.push(...shuffle([...ids]).slice(0, n));
    }

    if (questionIds.length === 0) {
      return NextResponse.json(
        { error: `No questions available for ${type} ${year}.` },
        { status: 404 },
      );
    }

    // Numbered title: "Model 2022", "Model 2022 (2)", etc.
    const existingCount = await prisma.examination.count({
      where: { title: { startsWith: titleBase } },
    });
    const index = existingCount + 1;
    const title = `${titleBase}${index > 1 ? ` (${index})` : ""}`;

    const exam = await prisma.examination.create({
      data: {
        title,
        questions: { connect: questionIds.map((id) => ({ id })) },
      },
    });

    return NextResponse.json({ exam_id: exam.id });
  }

  // ── MODE: hard ──────────────────────────────────────────────────────────────
  else if (mode === "hard") {
    // Hard mode: flagged OR previously answered incorrectly.
    // No deduplication needed here — the pool is inherently personal and dynamic.
    const [flagged, incorrect] = await Promise.all([
      prisma.question.findMany({
        where: { is_flagged: true },
        select: { id: true },
      }),
      prisma.attemptAnswer.findMany({
        where: { is_correct: false, selected_choice_id: { not: null } },
        select: { question_id: true },
        distinct: ["question_id"],
      }),
    ]);

    const idSet = new Set<number>([
      ...flagged.map((q) => q.id),
      ...incorrect.map((a) => a.question_id),
    ]);

    if (idSet.size === 0) {
      return NextResponse.json(
        { error: "No flagged or previously incorrect questions found yet." },
        { status: 404 },
      );
    }

    questionIds = shuffle(Array.from(idSet)).slice(0, TOTAL);

    const exam = await prisma.examination.create({
      data: {
        title: "Hard",
        questions: { connect: questionIds.map((id) => ({ id })) },
      },
    });

    return NextResponse.json({ exam_id: exam.id });
  }

  // ── Unknown mode ────────────────────────────────────────────────────────────
  else {
    return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  }

  // ── Create exam (random + catalog reach here) ─────────────────────────────
  if (questionIds.length === 0) {
    return NextResponse.json(
      { error: "No questions available for this mode." },
      { status: 404 },
    );
  }

  const exam = await prisma.examination.create({
    data: {
      title: examTitle ?? mode,
      questions: { connect: questionIds.map((id) => ({ id })) },
    },
  });

  return NextResponse.json({ exam_id: exam.id });
}
