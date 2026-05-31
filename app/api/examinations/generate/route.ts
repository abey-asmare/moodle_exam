// app/api/examinations/generate/route.ts
//
// Creates (or reuses) an Examination for the requested mode, then returns its id.
// The client navigates to /examination/[id] after this call.
//
// Body shapes:
//   { mode: "random" }
//   { mode: "catalog", type: "MODEL" | "EXIT" }
//   { mode: "year",    type: "MODEL" | "EXIT", year: number }
//   { mode: "hard" }
//
// All modes: 100 questions (or as many as available), proportional across subjects.
// Hard mode: questions the user flagged OR previously answered incorrectly.

import { Subject, Type } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const TOTAL = 110;
const SUBJECTS = Object.values(Subject);

// ── helpers ──────────────────────────────────────────────────────────────────

/** Shuffle an array in-place (Fisher-Yates) and return it. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Distribute `total` slots proportionally across buckets of varying size.
 * Returns a Map<key, count>.
 */
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

  // Fix rounding drift — add/remove from largest bucket
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

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json();
  const { mode } = body as { mode: string };

  let questionIds: number[] = [];

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

    const buckets = new Map<Subject, number>();
    SUBJECTS.forEach((s, i) => buckets.set(s, bySubject[i].length));

    const picks = proportionalPick(buckets, TOTAL);
    SUBJECTS.forEach((s, i) => {
      const n = picks.get(s) ?? 0;
      questionIds.push(...shuffle(bySubject[i].map((q) => q.id)).slice(0, n));
    });

    if (questionIds.length === 0) {
      return NextResponse.json(
        { error: "No questions found in the database yet." },
        { status: 404 },
      );
    }
  }

  // ── MODE: catalog ───────────────────────────────────────────────────────────
  else if (mode === "catalog") {
    const { type } = body as { type: "MODEL" | "EXIT" };

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

    const buckets = new Map<Subject, number[]>();
    for (const q of allQuestions) {
      const list = buckets.get(q.subject) ?? [];
      list.push(q.id);
      buckets.set(q.subject, list);
    }

    const sizeBuckets = new Map<Subject, number>();
    for (const [s, ids] of buckets) sizeBuckets.set(s, ids.length);

    const picks = proportionalPick(
      sizeBuckets,
      Math.min(TOTAL, allQuestions.length),
    );
    for (const [s, n] of picks) {
      const ids = buckets.get(s) ?? [];
      questionIds.push(...shuffle([...ids]).slice(0, n));
    }
  }

  // ── MODE: year ──────────────────────────────────────────────────────────────
  else if (mode === "year") {
    const { type, year } = body as { type: "MODEL" | "EXIT"; year: number };

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

    const buckets = new Map<Subject, number[]>();
    for (const q of allForYear) {
      const list = buckets.get(q.subject) ?? [];
      list.push(q.id);
      buckets.set(q.subject, list);
    }

    const sizeBuckets = new Map<Subject, number>();
    for (const [s, ids] of buckets) sizeBuckets.set(s, ids.length);

    const picks = proportionalPick(
      sizeBuckets,
      Math.min(TOTAL, allForYear.length),
    );
    for (const [s, n] of picks) {
      const ids = buckets.get(s) ?? [];
      questionIds.push(...shuffle([...ids]).slice(0, n));
    }

    const existingCount = await prisma.examination.count({
      where: {
        title: {
          startsWith: `${type === "MODEL" ? "Model" : "Exit"} ${year}`,
        },
      },
    });
    const index = existingCount + 1;
    const title = `${type === "MODEL" ? "Model" : "Exit"} ${year}${index > 1 ? ` (${index})` : ""}`;

    const exam = await prisma.examination.create({
      data: {
        title,
        type: type as Type,
        questions: { connect: questionIds.map((id) => ({ id })) },
      },
    });

    return NextResponse.json({ exam_id: exam.id });
  }

  // ── MODE: hard ──────────────────────────────────────────────────────────────
  else if (mode === "hard") {
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
  }

  // ── Unknown mode ────────────────────────────────────────────────────────────
  else {
    return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  }

  // ── Final guard + create (random, catalog, hard) ────────────────────────────
  if (questionIds.length === 0) {
    return NextResponse.json(
      { error: "No questions available for this mode." },
      { status: 404 },
    );
  }

  const modeLabel: Record<string, string> = {
    random: "Random",
    catalog: "Catalog",
    hard: "Hard",
  };

  const exam = await prisma.examination.create({
    data: {
      title: modeLabel[mode] ?? mode,
      type: "MODEL",
      questions: { connect: questionIds.map((id) => ({ id })) },
    },
  });

  return NextResponse.json({ exam_id: exam.id });
}
