// app/api/examinations/generate/route.ts
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

function proportionalPick<K>(buckets: Map<K, number>, total: number): Map<K, number> {
  const nonEmpty = Array.from(buckets.entries()).filter(([, n]) => n > 0);
  const totalAvailable = nonEmpty.reduce((a, [, n]) => a + n, 0);
  const want = Math.min(total, totalAvailable);

  const result = new Map<K, number>();
  let assigned = 0;

  for (const [key, size] of nonEmpty) {
    const share = Math.min(size, Math.round((size / totalAvailable) * want));
    result.set(key, share);
    assigned += share;
  }

  const diff = want - assigned;
  if (diff !== 0 && nonEmpty.length > 0) {
    const [biggestKey] = nonEmpty.reduce((a, b) => (b[1] > a[1] ? b : a));
    result.set(biggestKey, Math.max(0, (result.get(biggestKey) ?? 0) + diff));
  }

  return result;
}

/**
 * Returns every question ID that has ever been seen in a completed exam —
 * regardless of whether it was correct, incorrect, or skipped.
 * These are excluded from random / catalog / year pools entirely.
 */
async function seenIds(): Promise<Set<number>> {
  const completedExams = await prisma.examination.findMany({
    where: { attempts: { some: { finished_at: { not: null } } } },
    select: { questions: { select: { id: true } } },
  });

  const seen = new Set<number>();
  for (const exam of completedExams) {
    for (const q of exam.questions) seen.add(q.id);
  }
  return seen;
}

/**
 * Pick proportionally from pool, excluding seen IDs.
 * Exhausted subjects are skipped; their slots flow to remaining subjects.
 * Returns empty array if nothing is left — callers return an error.
 */
function pickFromPool(
  pool: { id: number; subject: Subject }[],
  seen: Set<number>,
  target: number,
): number[] {
  const buckets = new Map<Subject, number[]>();
  for (const q of pool) {
    if (seen.has(q.id)) continue;
    const b = buckets.get(q.subject) ?? [];
    b.push(q.id);
    buckets.set(q.subject, b);
  }

  const sizeBuckets = new Map<Subject, number>();
  for (const s of SUBJECTS) sizeBuckets.set(s, buckets.get(s)?.length ?? 0);

  const picks = proportionalPick(sizeBuckets, target);
  const result: number[] = [];
  for (const [s, n] of picks) {
    const ids = buckets.get(s) ?? [];
    result.push(...shuffle([...ids]).slice(0, n));
  }
  return result;
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json();
  const { mode } = body as { mode: string };

  // ── MODE: hard ──────────────────────────────────────────────────────────────
  // Pool = flagged + answered incorrectly. No seen-filter applied.
  if (mode === "hard") {
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

    const questionIds = shuffle(Array.from(idSet)).slice(0, TOTAL);
    const exam = await prisma.examination.create({
      data: {
        title: "Hard",
        questions: { connect: questionIds.map((id) => ({ id })) },
      },
    });
    return NextResponse.json({ exam_id: exam.id });
  }

  // ── Compute seen-set once for random / catalog / year ─────────────────────
  const seen = await seenIds();

  // ── MODE: random ────────────────────────────────────────────────────────────
  if (mode === "random") {
    const pool = await prisma.question.findMany({
      select: { id: true, subject: true },
    });

    if (pool.length === 0) {
      return NextResponse.json(
        { error: "No questions found in the database yet." },
        { status: 404 },
      );
    }

    const questionIds = pickFromPool(pool, seen, TOTAL);

    if (questionIds.length === 0) {
      return NextResponse.json(
        { error: "You've seen all available questions. Use Hard mode to practise flagged and missed ones." },
        { status: 404 },
      );
    }

    const exam = await prisma.examination.create({
      data: {
        title: "Random",
        questions: { connect: questionIds.map((id) => ({ id })) },
      },
    });
    return NextResponse.json({ exam_id: exam.id });
  }

  // ── MODE: catalog ───────────────────────────────────────────────────────────
  if (mode === "catalog") {
    const { type } = body as { type: "MODEL" | "EXIT" };
    const label = type === "MODEL" ? "Model" : "Exit";

    const pool = await prisma.question.findMany({
      where: { type: type as Type },
      select: { id: true, subject: true },
    });

    if (pool.length === 0) {
      return NextResponse.json(
        { error: `No ${type} questions found.` },
        { status: 404 },
      );
    }

    const questionIds = pickFromPool(pool, seen, Math.min(TOTAL, pool.length));

    if (questionIds.length === 0) {
      return NextResponse.json(
        { error: `You've seen all ${label} questions. Use Hard mode to practise flagged and missed ones.` },
        { status: 404 },
      );
    }

    const exam = await prisma.examination.create({
      data: {
        title: label,
        questions: { connect: questionIds.map((id) => ({ id })) },
      },
    });
    return NextResponse.json({ exam_id: exam.id });
  }

  // ── MODE: year ──────────────────────────────────────────────────────────────
  if (mode === "year") {
    const { type, year } = body as { type: "MODEL" | "EXIT"; year: number };
    const label = type === "MODEL" ? "Model" : "Exit";
    const titleBase = `${label} ${year}`;

    const pool = await prisma.question.findMany({
      where: { year, type: type as Type },
      select: { id: true, subject: true },
    });

    if (pool.length === 0) {
      return NextResponse.json(
        { error: `No questions found for ${type} ${year}.` },
        { status: 404 },
      );
    }

    const questionIds = pickFromPool(pool, seen, Math.min(TOTAL, pool.length));

    if (questionIds.length === 0) {
      return NextResponse.json(
        { error: `You've seen all ${label} ${year} questions. Use Hard mode to practise flagged and missed ones.` },
        { status: 404 },
      );
    }

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

  return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
}