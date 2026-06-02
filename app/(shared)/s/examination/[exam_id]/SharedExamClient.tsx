// app/(shared)/examination/[exam_id]/SharedExamClient.tsx
// Shared (public) exam client — all state lives in localStorage.
// No DB writes
"use client";

import { formatTime } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Choice = { id: number; choice_text: string };

type Question = {
  id: number;
  text: string;
  subject: string;
  choices: Choice[];
};

type SafeExam = {
  id: number;
  title: string | null;
  questions: Question[];
};

// What we persist to localStorage after submission
type LocalResult = {
  examId: number;
  answers: Record<number, number | null>; // questionId -> choiceId
  answerKey: Record<number, number | null>; // questionId -> correct choiceId
  score: number;
  total: number;
  finishedAt: string;
};

type Phase = "start" | "exam" | "result" | "review";

// ─── Storage helpers ──────────────────────────────────────────────────────────

function storageKey(examId: number) {
  return `shared_exam_result_${examId}`;
}

function loadResult(examId: number): LocalResult | null {
  try {
    const raw = localStorage.getItem(storageKey(examId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveResult(result: LocalResult) {
  try {
    localStorage.setItem(storageKey(result.examId), JSON.stringify(result));
  } catch {
    // storage full or private browsing — silently ignore
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SharedExamClient({
  exam,
  examId,
  totalTime,
}: {
  exam: SafeExam;
  examId: number;
  totalTime: number;
}) {
  const [phase, setPhase] = useState<Phase>("start");
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LocalResult | null>(null);
  const [reviewQ, setReviewQ] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef(false);

  // On mount: if there's a saved result, jump straight to result screen
  useEffect(() => {
    const saved = loadResult(examId);
    if (saved) {
      setResult(saved);
      setPhase("result");
    }
  }, [examId]);

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (_auto = false) => {
      if (autoSubmitRef.current) return;
      autoSubmitRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      setSubmitting(true);

      try {
        // Fetch the answer key — only revealed at submission time
        const res = await fetch(
          `/api/examinations/shared/answers?exam_id=${examId}`,
        );
        const data = await res.json();
        const answerKey: Record<number, number | null> = data.answers ?? {};

        let score = 0;
        for (const q of exam.questions) {
          const selected = answers[q.id] ?? null;
          if (selected !== null && selected === answerKey[q.id]) score++;
        }

        const localResult: LocalResult = {
          examId,
          answers,
          answerKey,
          score,
          total: exam.questions.length,
          finishedAt: new Date().toISOString(),
        };

        saveResult(localResult);
        setResult(localResult);
        setPhase("result");
      } finally {
        setSubmitting(false);
      }
    },
    [examId, exam.questions, answers],
  );

  // ── Timer ───────────────────────────────────────────────────────────────

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

  // ── Helpers ─────────────────────────────────────────────────────────────

  function startExam() {
    autoSubmitRef.current = false;
    setTimeLeft(totalTime);
    setPhase("exam");
  }

  function retake() {
    // Clear saved result and restart
    try {
      localStorage.removeItem(storageKey(examId));
    } catch {}
    setAnswers({});
    setCurrentQ(0);
    setResult(null);
    autoSubmitRef.current = false;
    setTimeLeft(totalTime);
    setPhase("start");
  }

  function selectChoice(questionId: number, choiceId: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  }

  function clearChoice(questionId: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: null }));
  }

  const questions = exam.questions;
  const answeredCount = Object.values(answers).filter(
    (v) => v !== null && v !== undefined,
  ).length;

  // ── Phase routing ────────────────────────────────────────────────────────

  if (phase === "start") {
    return (
      <StartScreen
        exam={exam}
        totalTime={totalTime}
        onStart={startExam}
        hasSavedResult={false}
      />
    );
  }

  if (phase === "result" && result) {
    return (
      <ResultScreen
        exam={exam}
        result={result}
        onReview={() => {
          setReviewQ(0);
          setPhase("review");
        }}
        onRetake={retake}
      />
    );
  }

  if (phase === "review" && result) {
    return (
      <ReviewScreen
        exam={exam}
        result={result}
        currentQ={reviewQ}
        setCurrentQ={setReviewQ}
        onBack={() => setPhase("result")}
      />
    );
  }

  // ── Exam phase ───────────────────────────────────────────────────────────

  const q = questions[currentQ];
  if (!q) return null;
  const selectedChoice = answers[q.id];
  const isVeryLowTime = timeLeft < 300;

  return (
    <Shell exam={exam}>
      {/* Timer bar */}
      <div className="flex justify-end px-4 py-2 border-b border-[#ddd]">
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

      <div className="flex gap-4 px-4 py-4 items-start max-w-5xl mx-auto">
        {/* Question */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#f5f5f5] border border-[#ddd] px-3 py-2 text-[13px] text-[#555] mb-0">
            Question {currentQ + 1} of {questions.length}
          </div>
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

        {/* Sidebar nav */}
        <div className="hidden md:block min-w-[220px] shrink-0">
          <div className="border border-[#ddd]">
            <div className="bg-[#f5f5f5] border-b border-[#ddd] px-3 py-2">
              <h3 className="text-[14px] font-semibold text-[#333]">
                Navigation
              </h3>
            </div>
            <div className="bg-white px-3 py-3">
              <div className="grid grid-cols-10 gap-0.5 mb-3">
                {questions.map((question, idx) => {
                  const isAnswered =
                    answers[question.id] !== null &&
                    answers[question.id] !== undefined;
                  const isCurrent = idx === currentQ;
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentQ(idx)}
                      title={`Question ${idx + 1}`}
                      className={cn(
                        "h-[26px] w-full px-1 text-[11px] border transition-colors",
                        isCurrent
                          ? "bg-[#555] border-[#333] text-white"
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

              <div className="space-y-1 text-[11px] text-[#555] mb-3 border-t border-[#eee] pt-2">
                {[
                  { cls: "bg-white border-[#ccc]", label: "Not answered" },
                  { cls: "bg-[#dce9f5] border-[#ccc]", label: "Answered" },
                  { cls: "bg-[#555] border-[#333]", label: "Current" },
                ].map(({ cls, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={cn("h-4 w-4 border rounded-sm", cls)} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-[#777] mb-2">
                {answeredCount} / {questions.length} answered
              </div>

              <button
                disabled={submitting}
                onClick={() => handleSubmit()}
                className="w-full py-1.5 text-[13px] text-white bg-[#337ab7] border border-[#2e6da4] rounded hover:bg-[#286090] disabled:opacity-70 transition-colors"
              >
                {submitting ? "Submitting…" : "Finish attempt …"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav strip */}
      <div className="md:hidden border-t border-[#ddd] px-3 py-3">
        <div className="grid grid-cols-8 gap-1 mb-3">
          {questions.map((question, idx) => {
            const isAnswered =
              answers[question.id] !== null &&
              answers[question.id] !== undefined;
            const isCurrent = idx === currentQ;
            return (
              <button
                key={question.id}
                onClick={() => setCurrentQ(idx)}
                className={cn(
                  "h-9 text-[12px] border",
                  isCurrent
                    ? "bg-[#555] border-[#333] text-white"
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
          className="w-full py-2 text-[14px] text-white bg-[#5cb85c] border border-[#4cae4c] rounded disabled:opacity-70"
        >
          {submitting ? "Submitting…" : "Finish attempt"}
        </button>
      </div>
    </Shell>
  );
}

// ─── Start Screen ─────────────────────────────────────────────────────────────

function StartScreen({
  exam,
  totalTime,
  onStart,
  hasSavedResult,
}: {
  exam: SafeExam;
  totalTime: number;
  onStart: () => void;
  hasSavedResult: boolean;
}) {
  return (
    <Shell exam={exam}>
      <div className="p-4 max-w-2xl">
        <div className="border border-[#ddd]">
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
                </ul>
              </div>
            </div>

            {hasSavedResult && (
              <div className="bg-[#d9edf7] border border-[#bce8f1] px-4 py-3 text-[13px] text-[#31708f]">
                You have a saved result for this exam. Starting again will
                overwrite it.
              </div>
            )}

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
    </Shell>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({
  exam,
  result,
  onReview,
  onRetake,
}: {
  exam: SafeExam;
  result: LocalResult;
  onReview: () => void;
  onRetake: () => void;
}) {
  const { score, total, answers, answerKey } = result;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = pct >= 50;

  let correct = 0,
    wrong = 0,
    skipped = 0;
  for (const q of exam.questions) {
    const selected = answers[q.id] ?? null;
    if (selected === null) {
      skipped++;
    } else if (selected === answerKey[q.id]) {
      correct++;
    } else {
      wrong++;
    }
  }

  return (
    <Shell exam={exam}>
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
                <tr>
                  <td className="px-3 py-2 bg-[#f5f5f5] font-medium text-[#555]">
                    Skipped
                  </td>
                  <td className="px-3 py-2 text-[#8a6d3b] font-semibold">
                    {skipped}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="text-[12px] text-[#888] mb-4 flex items-center gap-1.5">
              <span>
                Result saved in your browser. You can review it anytime by
                returning to this URL.
              </span>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={onReview}
                className="inline-flex items-center px-5 py-2 text-[14px] text-white bg-[#337ab7] border border-[#2e6da4] rounded hover:bg-[#286090] transition-colors"
              >
                Review answers →
              </button>
              <button
                onClick={onRetake}
                className="inline-flex items-center px-5 py-2 text-[14px] text-[#333] bg-[#e8e8e8] border border-[#ccc] rounded hover:bg-[#d5d5d5] transition-colors"
              >
                Retake exam
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ─── Review Screen ────────────────────────────────────────────────────────────

function ReviewScreen({
  exam,
  result,
  currentQ,
  setCurrentQ,
  onBack,
}: {
  exam: SafeExam;
  result: LocalResult;
  currentQ: number;
  setCurrentQ: (n: number) => void;
  onBack: () => void;
}) {
  const q = exam.questions[currentQ];
  if (!q) return null;

  const selectedId = result.answers[q.id] ?? null;
  const correctId = result.answerKey[q.id] ?? null;
  const isCorrect = selectedId !== null ? selectedId === correctId : null;

  return (
    <Shell exam={exam}>
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

      <div className="flex gap-4 px-4 py-4 items-start max-w-5xl mx-auto">
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
                {isCorrect === null && (
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
                const isAnswer = correctId === choice.id;
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
            {currentQ < exam.questions.length - 1 && (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                className="inline-flex items-center px-4 py-1.5 text-[13px] text-white bg-[#337ab7] border border-[#2e6da4] rounded hover:bg-[#286090]"
              >
                Next question
              </button>
            )}
          </div>
        </div>

        {/* Sidebar nav */}
        <div className="hidden md:block min-w-[220px] shrink-0">
          <div className="border border-[#ddd]">
            <div className="bg-[#f5f5f5] border-b border-[#ddd] px-3 py-2">
              <h3 className="text-[14px] font-semibold">Quiz navigation</h3>
            </div>
            <div className="bg-white px-3 py-3">
              <div className="grid grid-cols-9 gap-0.5 mb-3">
                {exam.questions.map((question, idx) => {
                  const selected = result.answers[question.id] ?? null;
                  const correct = result.answerKey[question.id] ?? null;
                  const qCorrect =
                    selected !== null ? selected === correct : null;
                  const isCurrent = idx === currentQ;
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentQ(idx)}
                      className={cn(
                        "h-[26px] w-full text-[11px] border transition-colors",
                        isCurrent
                          ? "bg-[#555] border-[#333] text-white"
                          : qCorrect === true
                            ? "bg-[#dff0d8] border-[#ccc] text-[#3c763d]"
                            : qCorrect === false
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

      {/* Mobile review nav */}
      <div className="md:hidden border-t border-[#ddd] px-3 py-3">
        <div className="grid grid-cols-8 gap-1 mb-3">
          {exam.questions.map((question, idx) => {
            const selected = result.answers[question.id] ?? null;
            const correct = result.answerKey[question.id] ?? null;
            const qCorrect = selected !== null ? selected === correct : null;
            const isCurrent = idx === currentQ;
            return (
              <button
                key={question.id}
                onClick={() => setCurrentQ(idx)}
                className={cn(
                  "h-9 text-[12px] border",
                  isCurrent
                    ? "bg-[#555] border-[#333] text-white"
                    : qCorrect === true
                      ? "bg-[#dff0d8] border-[#ccc] text-[#3c763d]"
                      : qCorrect === false
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
    </Shell>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
// Minimal Moodle-style wrapper (no MoodleShell import — shared route
// has no dependency on the protected layout components).

function Shell({
  exam,
  children,
}: {
  exam: SafeExam;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white font-sans text-[#333]">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-[#ddd] px-4 py-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#003087] flex items-center justify-center shrink-0">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <span className="text-[8px] font-bold text-[#003087] leading-tight text-center">
              MoE
            </span>
          </div>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-[#333]">MoEEE</div>
          <div className="text-[11px] text-[#777]">MoE - Exit Exam</div>
        </div>
        <div className="ml-auto text-[13px] text-[#555] truncate max-w-[60%] text-right">
          {exam.title ?? `Exam #${exam.id}`}
        </div>
      </div>
      {children}
    </div>
  );
}
