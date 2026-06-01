"use client";

import { ExamAttempt } from "@/app/generated/prisma/client";
// app/examination/[exam_id]/ExamClient.tsx
// Full client-side exam logic — timer, answers, navigation, review.
// Flag state is initialised from Question.is_flagged and persisted to DB via API.

import { cn } from "@/lib/utils";
import { Phase, SafeExam, SafeQuestion, ScoredQuestion } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  MinusCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import MoodleShell from "./MoodleShell";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExamClient({
  exam,
  examId,
  totalTime,
}: {
  exam: SafeExam;
  examId: number;
  totalTime: number;
}) {
  const [phase, setPhase] = useState<Phase>("start");
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [scoredQuestions, setScoredQuestions] = useState<ScoredQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [submitting, setSubmitting] = useState(false);
  const [reviewQ, setReviewQ] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitRef = useRef(false);

  // Initialise flagged set from DB state (is_flagged on each question)
  const [flagged, setFlagged] = useState<Set<number>>(
    () => new Set(exam.questions.filter((q) => q.is_flagged).map((q) => q.id)),
  );

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (_auto = false) => {
      if (autoSubmitRef.current) return;
      autoSubmitRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      setSubmitting(true);
      try {
        const res = await fetch(`/api/exams/${examId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attempt_id: attempt?.id, answers }),
        });
        const data = await res.json();
        setAttempt(data.attempt);
        setScoredQuestions(data.questions ?? []);
        setPhase("result");
      } finally {
        setSubmitting(false);
      }
    },
    [examId, attempt, answers],
  );

  // ── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase, handleSubmit]);

  // ── Start ─────────────────────────────────────────────────────────────────

  async function startExam() {
    const res = await fetch(`/api/exams/${examId}/start`, { method: "POST" });
    const data = await res.json();
    setAttempt(data.attempt);
    setTimeLeft(totalTime);
    autoSubmitRef.current = false;
    setPhase("exam");
  }

  // ── Answer helpers ────────────────────────────────────────────────────────

  function selectChoice(questionId: number, choiceId: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  }
  function clearChoice(questionId: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: null }));
  }

  // Persists flag toggle to DB, then updates local state optimistically
  async function toggleFlag(questionId: number) {
    // Optimistic update
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });

    // Persist to DB
    try {
      await fetch(`/api/exams/${examId}/questions/${questionId}/flag`, {
        method: "POST",
      });
    } catch {
      // Revert on failure
      setFlagged((prev) => {
        const next = new Set(prev);
        next.has(questionId) ? next.delete(questionId) : next.add(questionId);
        return next;
      });
    }
  }

  const questions = exam.questions;
  const answeredCount = Object.values(answers).filter(
    (v) => v !== null && v !== undefined,
  ).length;

  // ── Phase routing ─────────────────────────────────────────────────────────

  if (phase === "start") {
    return (
      <StartScreen exam={exam} totalTime={totalTime} onStart={startExam} />
    );
  }

  if (phase === "result" && attempt) {
    return (
      <ResultScreen
        exam={exam}
        attempt={attempt}
        questions={questions}
        onReview={() => {
          setReviewQ(0);
          setPhase("review");
        }}
      />
    );
  }

  if (phase === "review" && attempt) {
    return (
      <ReviewScreen
        exam={exam}
        attempt={attempt}
        questions={
          scoredQuestions.length > 0
            ? scoredQuestions
            : (questions as ScoredQuestion[])
        }
        currentQ={reviewQ}
        setCurrentQ={setReviewQ}
        onBack={() => setPhase("result")}
      />
    );
  }

  // ── Exam phase ────────────────────────────────────────────────────────────

  const q = questions[currentQ];
  if (!q) return null;
  const selectedChoice = answers[q.id];
  const isVeryLowTime = timeLeft < 300;

  return (
    <MoodleShell exam={exam}>
      {/* ── Desktop layout ── */}
      <div className="hidden md:block">
        <div className="px-4 pt-3 pb-1">
          <Link
            href="/examination"
            className="inline-flex items-center px-3 py-1.5 text-[13px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded hover:bg-[#d5d5d5] transition-colors"
          >
            Back
          </Link>
        </div>

        <div className="flex justify-end px-4 pb-2">
          <div
            className={cn(
              "inline-flex items-center border px-3 py-1.5 text-[14px]",
              isVeryLowTime
                ? "border-red-400 text-red-700 bg-red-50"
                : "border-[#ccc] text-[#333] bg-white",
            )}
          >
            Time left&nbsp;
            <span className="font-semibold tabular-nums">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="flex gap-4 px-4 pb-6 items-start">
          <QuestionInfoBlock
            index={currentQ}
            questionId={q.id}
            answered={answers[q.id] !== null && answers[q.id] !== undefined}
            flagged={flagged.has(q.id)}
            onToggleFlag={() => toggleFlag(q.id)}
          />
          {/* Question */}
          <div className="flex-1 min-w-0 mr-4">
            <div className="border border-t-0 border-[#ddd] bg-[#ebf3fc] px-4 py-4 mb-3">
              <div className="text-[14.5px] text-[#333] leading-relaxed mb-4">
                {q.text}
              </div>
              <div className="space-y-1">
                {q.choices.map((choice, idx) => {
                  const letter = String.fromCharCode(97 + idx);
                  const isSelected = selectedChoice === choice.id;
                  return (
                    <label
                      key={choice.id}
                      className="flex items-center gap-2 cursor-pointer text-[14px] text-[#333] py-0.5"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={choice.id}
                        checked={isSelected}
                        onChange={() => selectChoice(q.id, choice.id)}
                        className="w-4 h-4 accent-[#337ab7] cursor-pointer"
                      />
                      <span className="w-5 shrink-0">{letter}.</span>
                      <span>{choice.choice_text}</span>
                    </label>
                  );
                })}
              </div>
              {selectedChoice !== undefined && selectedChoice !== null && (
                <button
                  onClick={() => clearChoice(q.id)}
                  className="text-[#337ab7] text-[13px] mt-3 hover:underline block"
                >
                  Clear my choice
                </button>
              )}
            </div>

            <div className="flex justify-between">
              <button
                disabled={currentQ === 0}
                onClick={() => setCurrentQ((p) => p - 1)}
                className="inline-flex items-center px-4 py-1.5 text-[13px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded hover:bg-[#d5d5d5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous question
              </button>
              {currentQ < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ((p) => p + 1)}
                  className="inline-flex items-center px-4 py-1.5 text-[13px] text-white bg-[#337ab7] border border-[#2e6da4] rounded hover:bg-[#286090] transition-colors"
                >
                  Next question
                </button>
              ) : (
                <button
                  disabled={submitting}
                  onClick={() => handleSubmit()}
                  className="inline-flex items-center px-4 py-1.5 text-[13px] text-white bg-[#5cb85c] border border-[#4cae4c] rounded hover:bg-[#449d44] disabled:opacity-70 transition-colors"
                >
                  {submitting ? "Submitting…" : "Finish attempt"}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="min-w-[240px] shrink-0">
            <ExamNavSidebar
              questions={questions}
              answers={answers}
              flagged={flagged}
              currentQ={currentQ}
              setCurrentQ={setCurrentQ}
              submitting={submitting}
              onSubmit={() => handleSubmit()}
              answeredCount={answeredCount}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="block md:hidden">
        <div className="px-3 pt-3 pb-2">
          <Link
            href="/examination"
            className="inline-flex items-center px-4 py-1.5 text-[14px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded"
          >
            Back
          </Link>
        </div>

        <div className="flex justify-end px-3 pb-3">
          <div
            className={cn(
              "inline-flex items-center border px-3 py-1.5 text-[14px]",
              isVeryLowTime
                ? "border-red-400 text-red-700"
                : "border-[#ccc] text-[#333]",
            )}
          >
            Time left&nbsp;
            <span className="font-semibold tabular-nums">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="mx-3">
          <QuestionInfoBlock
            index={currentQ}
            questionId={q.id}
            answered={answers[q.id] !== null && answers[q.id] !== undefined}
            flagged={flagged.has(q.id)}
            onToggleFlag={() => toggleFlag(q.id)}
          />
        </div>

        <div className="mx-3 border border-t-0 border-[#ddd] bg-[#ebf3fc] px-4 py-4 mb-4">
          <div className="text-[15px] text-[#333] leading-relaxed mb-5">
            {q.text}
          </div>
          <div className="space-y-3">
            {q.choices.map((choice, idx) => {
              const letter = String.fromCharCode(97 + idx);
              const isSelected = selectedChoice === choice.id;
              return (
                <label
                  key={choice.id}
                  className="flex items-center gap-3 cursor-pointer text-[15px] text-[#333]"
                >
                  <input
                    type="radio"
                    name={`q-mobile-${q.id}`}
                    value={choice.id}
                    checked={isSelected}
                    onChange={() => selectChoice(q.id, choice.id)}
                    className="w-5 h-5 accent-[#337ab7] cursor-pointer shrink-0"
                  />
                  <span className="w-5 shrink-0">{letter}.</span>
                  <span>{choice.choice_text}</span>
                </label>
              );
            })}
          </div>
          {selectedChoice !== undefined && selectedChoice !== null && (
            <button
              onClick={() => clearChoice(q.id)}
              className="text-[#337ab7] text-[14px] mt-4 hover:underline block"
            >
              Clear my choice
            </button>
          )}
        </div>

        <div className="flex justify-between px-3 mb-6">
          <button
            disabled={currentQ === 0}
            onClick={() => setCurrentQ((p) => p - 1)}
            className="inline-flex items-center px-5 py-2 text-[14px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded disabled:opacity-50"
          >
            Previous question
          </button>
          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ((p) => p + 1)}
              className="inline-flex items-center px-5 py-2 text-[14px] text-white bg-[#337ab7] border border-[#2e6da4] rounded"
            >
              Next question
            </button>
          ) : (
            <button
              disabled={submitting}
              onClick={() => handleSubmit()}
              className="inline-flex items-center px-5 py-2 text-[14px] text-white bg-[#5cb85c] border border-[#4cae4c] rounded disabled:opacity-70"
            >
              {submitting ? "Submitting…" : "Finish attempt"}
            </button>
          )}
        </div>

        <div className="mx-3 mb-6">
          <h3 className="text-[16px] font-bold text-[#333] mb-3">
            Quiz navigation
          </h3>
          <div className="grid grid-cols-8 gap-1 mb-3">
            {questions.map((question, idx) => {
              const isAnswered =
                answers[question.id] !== null &&
                answers[question.id] !== undefined;
              const isCurrent = idx === currentQ;
              const isFlagged = flagged.has(question.id);
              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentQ(idx)}
                  className={cn(
                    "h-9 w-full text-[13px] font-normal border transition-colors",
                    isCurrent
                      ? "bg-[#555] border-[#333] text-white"
                      : isFlagged
                        ? "bg-[#f0ad4e] border-[#eea236] text-white"
                        : isAnswered
                          ? "bg-[#dce9f5] border-[#ccc] text-[#333]"
                          : "bg-white border-[#ccc] text-[#333]",
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <button
            disabled={submitting}
            onClick={() => handleSubmit()}
            className="w-full py-2 text-[14px] text-white bg-[#337ab7] border border-[#2e6da4] rounded hover:bg-[#286090] disabled:opacity-70"
          >
            {submitting ? "Submitting…" : "Finish attempt ..."}
          </button>
        </div>
      </div>
    </MoodleShell>
  );
}

// ─── Question Info Block ──────────────────────────────────────────────────────

function QuestionInfoBlock({
  index,
  questionId,
  answered,
  flagged,
  onToggleFlag,
}: {
  index: number;
  questionId: number;
  answered: boolean;
  flagged: boolean;
  onToggleFlag: () => void;
}) {
  return (
    <div className="border border-[#ddd]">
      <div className="bg-[#f5f5f5] border-b border-[#ddd] px-3 py-2">
        <div className="text-[14px] font-bold text-[#333]">
          Question <span className="font-bold">{index + 1}</span>
        </div>
        <div className="text-[13px] text-[#555] mt-0.5">
          {answered ? "Answer saved" : "Not yet answered"}
        </div>
        <div className="text-[13px] text-[#555]">Marked out of 1.00</div>
        <button
          onClick={onToggleFlag}
          className={cn(
            "mt-1 flex items-center gap-1 text-[13px]",
            flagged ? "text-[#c9302c]" : "text-[#337ab7]",
          )}
        >
          <Flag size={12} fill={flagged ? "currentColor" : "none"} />
          {flagged ? "Remove flag" : "Flag question"}
        </button>
      </div>
    </div>
  );
}

// ─── Exam Nav Sidebar ─────────────────────────────────────────────────────────

function ExamNavSidebar({
  questions,
  answers,
  flagged,
  currentQ,
  setCurrentQ,
  submitting,
  onSubmit,
  answeredCount,
}: {
  questions: SafeQuestion[];
  answers: Record<number, number | null>;
  flagged: Set<number>;
  currentQ: number;
  setCurrentQ: (n: number) => void;
  submitting: boolean;
  onSubmit: () => void;
  answeredCount: number;
}) {
  return (
    <div className="border border-[#ddd]">
      <div className="bg-[#f5f5f5] border-b border-[#ddd] px-3 py-2">
        <h3 className="text-[14px] font-semibold text-[#333]">
          Exam Navigation
        </h3>
      </div>
      <div className="bg-white px-3 py-3">
        <div className="grid grid-cols-10 gap-0.5 mb-3">
          {questions.map((question, idx) => {
            const isAnswered =
              answers[question.id] !== null &&
              answers[question.id] !== undefined;
            const isCurrent = idx === currentQ;
            const isFlagged = flagged.has(question.id);
            return (
              <button
                key={question.id}
                onClick={() => setCurrentQ(idx)}
                title={`Question ${idx + 1}`}
                className={cn(
                  "h-[26px] w-full px-1 text-[11px] font-normal border transition-colors",
                  isCurrent
                    ? "bg-[#555] border-[#333] text-white"
                    : isFlagged
                      ? "bg-[#f0ad4e] border-[#eea236] text-white"
                      : isAnswered
                        ? "bg-[#dce9f5] border-[#ccc] text-[#333] hover:bg-[#c4d9ed]"
                        : "bg-white border-[#ccc] text-[#333] hover:bg-[#f5f5f5]",
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="space-y-1 text-[11px] text-[#555] mb-3 border-t border-[#eee] pt-2">
          {[
            { cls: "bg-white border-[#ccc]", label: "Not answered" },
            { cls: "bg-[#dce9f5] border-[#ccc]", label: "Answered" },
            { cls: "bg-[#f0ad4e] border-[#eea236]", label: "Flagged" },
            { cls: "bg-[#555] border-[#333]", label: "Current" },
          ].map(({ cls, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn("h-4 w-4 border rounded-sm", cls)} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-[#777] mb-1">
          {answeredCount} / {questions.length} answered
        </div>

        <button
          disabled={submitting}
          onClick={onSubmit}
          className="w-full py-1.5 text-[13px] text-white bg-[#337ab7] border border-[#2e6da4] rounded hover:bg-[#286090] disabled:opacity-70 transition-colors"
        >
          {submitting ? "Submitting…" : "Finish attempt ..."}
        </button>
      </div>
    </div>
  );
}


function StartScreen({
  exam,
  totalTime,
  onStart,
}: {
  exam: SafeExam;
  totalTime: number;
  onStart: () => void;
}) {
  return (
    <MoodleShell exam={exam}>
      <div className="p-4 max-w-2xl">
        <div className="border border-[#ddd] mb-4">
          <div className="bg-[#f5f5f5] border-b border-[#ddd] px-4 py-2">
            <h2 className="text-[16px] font-semibold">
              {exam.title ?? "Examination"}
            </h2>
          </div>
          <div className="px-4 py-4 space-y-4">
            <table className="w-full text-[14px] border border-[#ddd]">
              <tbody>
                {[
                  ["Total questions", String(exam.questions.length)],
                  ["Time allowed", formatTime(totalTime)],
                  [
                    "Grading method",
                    "1 mark per question, no negative marking",
                  ],
                ].map(([label, value]) => (
                  <tr
                    key={label}
                    className="border-b border-[#ddd] last:border-b-0"
                  >
                    <td className="px-3 py-2 bg-[#f5f5f5] font-medium text-[#555] w-40">
                      {label}
                    </td>
                    <td className="px-3 py-2">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex gap-3 bg-[#fcf8e3] border border-[#faebcc] px-4 py-3 text-[13px] text-[#8a6d3b]">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-[#f0ad4e]"
              />
              <div className="space-y-1">
                <p className="font-medium">Before you start:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[12px]">
                  <li>The timer starts immediately and cannot be paused.</li>
                  <li>The exam will auto-submit when time expires.</li>
                  <li>You may navigate freely between questions.</li>
                  <li>Flagged questions are saved to your account.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onStart}
                className="inline-flex items-center px-5 py-2 text-[14px] text-white bg-[#337ab7] border border-[#2e6da4] rounded hover:bg-[#286090] transition-colors"
              >
                Start attempt →
              </button>
            </div>
          </div>
        </div>
      </div>
    </MoodleShell>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({
  exam,
  attempt,
  questions,
  onReview,
}: {
  exam: SafeExam;
  attempt: ExamAttempt;
  questions: SafeQuestion[];
  onReview: () => void;
}) {
  const score = attempt.score ?? 0;
  const total = questions.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = pct >= 50;
  const correct = attempt.answers.filter((a) => a.is_correct === true).length;
  const wrong = attempt.answers.filter((a) => a.is_correct === false).length;
  const skipped =
    total - attempt.answers.filter((a) => a.selected_choice_id !== null).length;
  const elapsed =
    attempt.started_at && attempt.finished_at
      ? Math.round(
          (new Date(attempt.finished_at).getTime() -
            new Date(attempt.started_at).getTime()) /
            1000,
        )
      : null;

  return (
    <MoodleShell exam={exam}>
      <div className="p-4 max-w-2xl space-y-4">
        <div className="border border-[#ddd]">
          <div className="bg-[#f5f5f5] border-b border-[#ddd] px-4 py-2">
            <h2 className="text-[16px] font-semibold">Your result</h2>
          </div>
          <div className="px-4 py-5">
            <div
              className={cn(
                "flex items-center gap-4 p-4 border mb-4",
                passed
                  ? "bg-[#dff0d8] border-[#d6e9c6]"
                  : "bg-[#f2dede] border-[#ebccd1]",
              )}
            >
              {passed ? (
                <CheckCircle2 size={36} className="text-[#3c763d] shrink-0" />
              ) : (
                <XCircle size={36} className="text-[#a94442] shrink-0" />
              )}
              <div>
                <div
                  className={cn(
                    "text-[28px] font-bold",
                    passed ? "text-[#3c763d]" : "text-[#a94442]",
                  )}
                >
                  {pct}%
                </div>
                <div
                  className={cn(
                    "text-[14px]",
                    passed ? "text-[#3c763d]" : "text-[#a94442]",
                  )}
                >
                  {score} / {total} marks · {passed ? "Passed" : "Not passed"}
                </div>
              </div>
            </div>

            <table className="w-full text-[14px] border border-[#ddd] mb-4">
              <tbody>
                <tr className="border-b border-[#ddd]">
                  <td className="px-3 py-2 bg-[#f5f5f5] font-medium text-[#555] w-40">
                    Correct
                  </td>
                  <td className="px-3 py-2 text-[#3c763d] font-semibold">
                    {correct}
                  </td>
                </tr>
                <tr className="border-b border-[#ddd]">
                  <td className="px-3 py-2 bg-[#f5f5f5] font-medium text-[#555]">
                    Incorrect
                  </td>
                  <td className="px-3 py-2 text-[#a94442] font-semibold">
                    {wrong}
                  </td>
                </tr>
                <tr className="border-b border-[#ddd]">
                  <td className="px-3 py-2 bg-[#f5f5f5] font-medium text-[#555]">
                    Skipped
                  </td>
                  <td className="px-3 py-2 text-[#8a6d3b] font-semibold">
                    {skipped}
                  </td>
                </tr>
                {elapsed !== null && (
                  <tr>
                    <td className="px-3 py-2 bg-[#f5f5f5] font-medium text-[#555]">
                      Time taken
                    </td>
                    <td className="px-3 py-2">{formatTime(elapsed)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex gap-3">
              <button
                onClick={onReview}
                className="inline-flex items-center px-5 py-2 text-[14px] text-white bg-[#337ab7] border border-[#2e6da4] rounded hover:bg-[#286090] transition-colors"
              >
                Review answers →
              </button>
              <Link
                href="/examination"
                className="inline-flex items-center px-5 py-2 text-[14px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded hover:bg-[#d5d5d5] transition-colors"
              >
                ← All exams
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MoodleShell>
  );
}

// ─── Review Screen ────────────────────────────────────────────────────────────

function ReviewScreen({
  exam,
  attempt,
  questions,
  currentQ,
  setCurrentQ,
  onBack,
}: {
  exam: SafeExam;
  attempt: ExamAttempt;
  questions: ScoredQuestion[];
  currentQ: number;
  setCurrentQ: (n: number) => void;
  onBack: () => void;
}) {
  const q = questions[currentQ];
  if (!q) return null;

  const attemptAnswer = attempt.answers.find((a) => a.question_id === q.id);
  const selectedId = attemptAnswer?.selected_choice_id ?? null;
  const isCorrect = attemptAnswer?.is_correct;

  return (
    <MoodleShell exam={exam}>
      <div className="bg-[#d9edf7] border-b border-[#bce8f1] px-4 py-2 text-[13px] text-[#31708f] flex items-center gap-2">
        <span className="font-medium">Review mode</span>
        <span className="text-[#6c757d]">— answers cannot be changed</span>
        <button
          onClick={onBack}
          className="ml-auto text-[#31708f] hover:underline text-[12px]"
        >
          ← Back to results
        </button>
      </div>

      {/* Desktop review */}
      <div className="hidden md:flex gap-4 px-4 py-4 items-start">
        <div className="flex-1 min-w-0">
          <div className="border border-[#ddd]">
            <div className="bg-[#f5f5f5] border-b border-[#ddd] px-3 py-2 flex items-center gap-3">
              <span className="text-[14px] font-bold">
                Question {currentQ + 1}
              </span>
              <div className="ml-auto">
                {isCorrect === true && (
                  <span className="flex items-center gap-1 text-[12px] font-medium text-[#3c763d] bg-[#dff0d8] border border-[#d6e9c6] px-2 py-0.5">
                    <CheckCircle2 size={12} /> Correct
                  </span>
                )}
                {isCorrect === false && (
                  <span className="flex items-center gap-1 text-[12px] font-medium text-[#a94442] bg-[#f2dede] border border-[#ebccd1] px-2 py-0.5">
                    <XCircle size={12} /> Incorrect
                  </span>
                )}
                {(isCorrect === null || isCorrect === undefined) && (
                  <span className="flex items-center gap-1 text-[12px] font-medium text-[#8a6d3b] bg-[#fcf8e3] border border-[#faebcc] px-2 py-0.5">
                    <MinusCircle size={12} /> Not answered
                  </span>
                )}
              </div>
            </div>
            <div className="bg-[#f5f5f5] border-b border-[#ddd] px-3 py-1 text-[13px] text-[#555]">
              Marked out of 1.00
            </div>
          </div>

          <div className="border border-t-0 border-[#ddd] bg-[#ebf3fc] px-4 py-4 mb-3">
            <div className="text-[14.5px] leading-relaxed mb-4">{q.text}</div>
            <div className="space-y-1">
              {q.choices.map((choice, idx) => {
                const letter = String.fromCharCode(97 + idx);
                const isSelected = selectedId === choice.id;
                const isAnswer = q.answer_id === choice.id;
                return (
                  <div
                    key={choice.id}
                    className={cn(
                      "flex items-center gap-2 py-0.5 px-1 text-[14px]",
                      isAnswer
                        ? "text-[#3c763d]"
                        : isSelected
                          ? "text-[#a94442]"
                          : "text-[#333]",
                    )}
                  >
                    <input
                      type="radio"
                      checked={isSelected}
                      readOnly
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="w-5 shrink-0">{letter}.</span>
                    <span className="flex-1">{choice.choice_text}</span>
                    {isAnswer && (
                      <CheckCircle2
                        size={14}
                        className="shrink-0 text-[#3c763d]"
                      />
                    )}
                    {isSelected && !isAnswer && (
                      <XCircle size={14} className="shrink-0 text-[#a94442]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              disabled={currentQ === 0}
              onClick={() => setCurrentQ(currentQ - 1)}
              className="inline-flex items-center px-4 py-1.5 text-[13px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded disabled:opacity-50"
            >
              Previous question
            </button>
            {currentQ < questions.length - 1 && (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                className="inline-flex items-center px-4 py-1.5 text-[13px] text-white bg-[#337ab7] border border-[#2e6da4] rounded hover:bg-[#286090]"
              >
                Next question
              </button>
            )}
          </div>
        </div>

        {/* Review sidebar */}
        <div className="min-w-[240px] shrink-0">
          <div className="border border-[#ddd]">
            <div className="bg-[#f5f5f5] border-b border-[#ddd] px-3 py-2">
              <h3 className="text-[14px] font-semibold">Quiz navigation</h3>
            </div>
            <div className="bg-white px-3 py-3">
              <div className="grid grid-cols-9 gap-0.5 mb-3">
                {questions.map((question, idx) => {
                  const ans = attempt.answers.find(
                    (a) => a.question_id === question.id,
                  );
                  const correct = ans?.is_correct;
                  const isCurrent = idx === currentQ;
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentQ(idx)}
                      className={cn(
                        "h-[26px] w-full text-[11px] border transition-colors",
                        isCurrent
                          ? "bg-[#555] border-[#333] text-white"
                          : correct === true
                            ? "bg-[#dff0d8] border-[#ccc] text-[#3c763d]"
                            : correct === false
                              ? "bg-[#f2dede] border-[#ccc] text-[#a94442]"
                              : "bg-[#fcf8e3] border-[#ccc] text-[#8a6d3b]",
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={onBack}
                className="w-full py-1.5 text-[13px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded hover:bg-[#d5d5d5]"
              >
                ← Return to results
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile review */}
      <div className="block md:hidden px-3 py-3">
        <div className="border border-[#ddd]">
          <div className="bg-[#f5f5f5] border-b border-[#ddd] px-3 py-2 flex items-center justify-between">
            <span className="text-[14px] font-bold">
              Question {currentQ + 1}
            </span>
            {isCorrect === true && (
              <span className="flex items-center gap-1 text-[12px] text-[#3c763d] bg-[#dff0d8] border border-[#d6e9c6] px-2 py-0.5">
                <CheckCircle2 size={12} /> Correct
              </span>
            )}
            {isCorrect === false && (
              <span className="flex items-center gap-1 text-[12px] text-[#a94442] bg-[#f2dede] border border-[#ebccd1] px-2 py-0.5">
                <XCircle size={12} /> Incorrect
              </span>
            )}
          </div>
          <div className="bg-[#f5f5f5] px-3 py-1 text-[13px] text-[#555]">
            Marked out of 1.00
          </div>
        </div>

        <div className="border border-t-0 border-[#ddd] bg-[#ebf3fc] px-4 py-4 mb-4">
          <div className="text-[15px] leading-relaxed mb-5">{q.text}</div>
          <div className="space-y-3">
            {q.choices.map((choice, idx) => {
              const letter = String.fromCharCode(97 + idx);
              const isSelected = selectedId === choice.id;
              const isAnswer = q.answer_id === choice.id;
              return (
                <div
                  key={choice.id}
                  className={cn(
                    "flex items-center gap-3 text-[15px]",
                    isAnswer
                      ? "text-[#3c763d]"
                      : isSelected
                        ? "text-[#a94442]"
                        : "text-[#333]",
                  )}
                >
                  <input
                    type="radio"
                    checked={isSelected}
                    readOnly
                    disabled
                    className="w-5 h-5 shrink-0"
                  />
                  <span className="w-5 shrink-0">{letter}.</span>
                  <span className="flex-1">{choice.choice_text}</span>
                  {isAnswer && (
                    <CheckCircle2
                      size={16}
                      className="shrink-0 text-[#3c763d]"
                    />
                  )}
                  {isSelected && !isAnswer && (
                    <XCircle size={16} className="shrink-0 text-[#a94442]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between mb-6">
          <button
            disabled={currentQ === 0}
            onClick={() => setCurrentQ(currentQ - 1)}
            className="px-5 py-2 text-[14px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded disabled:opacity-50"
          >
            Previous question
          </button>
          {currentQ < questions.length - 1 && (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              className="px-5 py-2 text-[14px] text-white bg-[#337ab7] border border-[#2e6da4] rounded"
            >
              Next question
            </button>
          )}
        </div>

        <h3 className="text-[16px] font-bold mb-3">Quiz navigation</h3>
        <div className="grid grid-cols-8 gap-1 mb-3">
          {questions.map((question, idx) => {
            const ans = attempt.answers.find(
              (a) => a.question_id === question.id,
            );
            const correct = ans?.is_correct;
            const isCurrent = idx === currentQ;
            return (
              <button
                key={question.id}
                onClick={() => setCurrentQ(idx)}
                className={cn(
                  "h-9 text-[13px] border",
                  isCurrent
                    ? "bg-[#555] border-[#333] text-white"
                    : correct === true
                      ? "bg-[#dff0d8] border-[#ccc] text-[#3c763d]"
                      : correct === false
                        ? "bg-[#f2dede] border-[#ccc] text-[#a94442]"
                        : "bg-[#fcf8e3] border-[#ccc] text-[#8a6d3b]",
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
        <button
          onClick={onBack}
          className="w-full py-2 text-[14px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded"
        >
          ← Return to results
        </button>
      </div>
    </MoodleShell>
  );
}
