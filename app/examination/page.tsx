"use client";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  ChevronRight,
  Flame,
  Loader2,
  RefreshCw,
  Shuffle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MetricsPanel from "./Metrics";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExamSummary = {
  id: number;
  title: string | null;
  type: "MODEL" | "EXIT";
  question_count: number;
  last_attempt: {
    id: number;
    score: number | null;
    finished_at: string | null;
    started_at: string;
  } | null;
};

type YearOption = { year: number; type: "MODEL" | "EXIT"; label: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExaminationPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Year/type picker state
  const [yearType, setYearType] = useState<"MODEL" | "EXIT">("MODEL");
  const [yearValue, setYearValue] = useState<number>(2019);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/examinations");
      if (!res.ok) throw new Error("Failed to load examinations.");
      setExams(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // ── Generate and navigate ──────────────────────────────────────────────────

  async function generate(body: Record<string, unknown>) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/examinations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate exam.");
      router.push(`/examination/${data.exam_id}`);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
      setGenerating(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

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
      </div>

      <div className="px-4 py-4 border-b border-[#ddd]">
        <h1 className="text-[28px] md:text-[32px] font-bold text-[#333]">
          Software Engineering
        </h1>
        <div className="text-[14px] text-[#777] mt-0.5">
          Exit Exam Practice — choose a mode to begin
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 bg-[#f2dede] border border-[#ebccd1] px-4 py-3 text-[13px] text-[#a94442] rounded-sm">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Metrics */}
        {!loading && <MetricsPanel exams={exams} />}
        {/* ── Mode cards ── */}
        <section>
          <h2 className="text-[15px] font-semibold text-[#333] mb-3 border-b border-[#ddd] pb-2">
            Start a new exam
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Random */}
            <ModeCard
              icon={<Shuffle size={22} />}
              title="Random"
              description="100 questions sampled equally from all 15 subjects. Any questions."
              color="blue"
              disabled={generating}
              onClick={() => generate({ mode: "random" })}
            />

            {/* Catalog — MODEL */}
            <ModeCard
              icon={<BookOpen size={22} />}
              title="Model Exam"
              description="Next unattempted model examination from the official catalog."
              color="green"
              disabled={generating}
              onClick={() => generate({ mode: "catalog", type: "MODEL" })}
            />

            {/* Catalog — EXIT */}
            <ModeCard
              icon={<BookOpen size={22} />}
              title="Exit Exam"
              description="Next unattempted exit examination from the official catalog."
              color="orange"
              disabled={generating}
              onClick={() => generate({ mode: "catalog", type: "EXIT" })}
            />

            {/* Hard */}
            <ModeCard
              icon={<Flame size={22} />}
              title="Hard"
              description="Questions you previously got wrong or flagged. Gets shorter as you improve."
              color="red"
              disabled={generating}
              onClick={() => generate({ mode: "hard" })}
            />
          </div>
        </section>

        {/* ── Year picker ── */}
        <section>
          <h2 className="text-[15px] font-semibold text-[#333] mb-3 border-b border-[#ddd] pb-2">
            By year
          </h2>
          <div className="border border-[#ddd] bg-[#f9f9f9] px-4 py-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Type toggle */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#555]">
                  Type
                </label>
                <div className="flex">
                  {(["MODEL", "EXIT"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setYearType(t)}
                      className={cn(
                        "px-4 py-1.5 text-[13px] border transition-colors",
                        t === "MODEL" ? "rounded-l-sm" : "rounded-r-sm -ml-px",
                        yearType === t
                          ? "bg-[#337ab7] border-[#2e6da4] text-white z-10 relative"
                          : "bg-white border-[#ccc] text-[#333] hover:bg-[#f5f5f5]",
                      )}
                    >
                      {t === "MODEL" ? "Model" : "Exit"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year select */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#555]">
                  Year
                </label>
                <select
                  value={yearValue}
                  onChange={(e) => setYearValue(Number(e.target.value))}
                  className="border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] text-[#333] bg-white h-[34px]"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                disabled={generating}
                onClick={() =>
                  generate({ mode: "year", type: yearType, year: yearValue })
                }
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] text-white bg-[#337ab7] border border-[#2e6da4] rounded-sm hover:bg-[#286090] disabled:opacity-60 transition-colors h-[34px]"
              >
                {generating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Calendar size={14} />
                )}
                Start {yearType === "MODEL" ? "Model" : "Exit"} {yearValue}
              </button>
            </div>
          </div>
        </section>

        {/* ── Exam list ── */}
        <section>
          <div className="flex items-center justify-between mb-3 border-b border-[#ddd] pb-2">
            <h2 className="text-[15px] font-semibold text-[#333]">
              All examinations
            </h2>
            <button
              onClick={fetchExams}
              disabled={loading}
              className="flex items-center gap-1.5 text-[12px] text-[#337ab7] hover:underline disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#888] gap-2 text-[14px]">
              <Loader2 size={18} className="animate-spin" />
              Loading examinations…
            </div>
          ) : exams.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-[#888]">
              No examinations found. Generate one above to get started.
            </div>
          ) : (
            <div className="border border-[#ddd] divide-y divide-[#eee]">
              {/* Table header — desktop */}
              <div className="hidden md:grid grid-cols-[1fr_120px_100px_140px_100px_44px] bg-[#f5f5f5] px-4 py-2 text-[12px] font-semibold text-[#555] uppercase tracking-wide">
                <span>Title</span>
                <span>Type</span>
                <span className="text-center">Questions</span>
                <span className="text-center">Last score</span>
                <span className="text-center">Review</span>
                <span />
              </div>

              {exams.map((exam) => (
                <ExamRow
                  key={exam.id}
                  exam={exam}
                  onClick={() => router.push(`/examination/${exam.id}`)}
                  onReview={() => router.push(`/examination/${exam.id}/review`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Full-screen generating overlay */}
      {generating && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3 text-[#333]">
            <Loader2 size={32} className="animate-spin text-[#337ab7]" />
            <span className="text-[15px]">Generating exam…</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mode Card ────────────────────────────────────────────────────────────────

const colorMap = {
  blue: {
    border: "border-[#bce8f1]",
    header: "bg-[#d9edf7] border-b border-[#bce8f1]",
    icon: "text-[#31708f]",
    btn: "bg-[#337ab7] border-[#2e6da4] hover:bg-[#286090]",
  },
  green: {
    border: "border-[#d6e9c6]",
    header: "bg-[#dff0d8] border-b border-[#d6e9c6]",
    icon: "text-[#3c763d]",
    btn: "bg-[#5cb85c] border-[#4cae4c] hover:bg-[#449d44]",
  },
  orange: {
    border: "border-[#faebcc]",
    header: "bg-[#fcf8e3] border-b border-[#faebcc]",
    icon: "text-[#8a6d3b]",
    btn: "bg-[#f0ad4e] border-[#eea236] hover:bg-[#ec971f]",
  },
  red: {
    border: "border-[#ebccd1]",
    header: "bg-[#f2dede] border-b border-[#ebccd1]",
    icon: "text-[#a94442]",
    btn: "bg-[#d9534f] border-[#d43f3a] hover:bg-[#c9302c]",
  },
};

function ModeCard({
  icon,
  title,
  description,
  color,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: keyof typeof colorMap;
  onClick: () => void;
  disabled: boolean;
}) {
  const c = colorMap[color];
  return (
    <div
      className={cn(
        "border rounded-sm overflow-hidden flex flex-col",
        c.border,
      )}
    >
      <div className={cn("px-4 py-3 flex items-center gap-2", c.header)}>
        <span className={c.icon}>{icon}</span>
        <span className="text-[14px] font-semibold text-[#333]">{title}</span>
      </div>
      <div className="px-4 py-3 flex-1 text-[13px] text-[#555] leading-relaxed">
        {description}
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "w-full py-1.5 text-[13px] text-white border rounded-sm transition-colors disabled:opacity-60",
            c.btn,
          )}
        >
          Start →
        </button>
      </div>
    </div>
  );
}

// ─── Exam Row ─────────────────────────────────────────────────────────────────

function ExamRow({
  exam,
  onClick,
  onReview,
}: {
  exam: ExamSummary;
  onClick: () => void;
  onReview: () => void;
}) {
  const attempt = exam.last_attempt;
  const attempted = attempt?.finished_at != null;
  const pct =
    attempted && attempt.score != null && exam.question_count > 0
      ? Math.round((attempt.score / exam.question_count) * 100)
      : null;

  return (
    <>
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[1fr_120px_100px_140px_100px_44px] w-full px-4 py-3 items-center hover:bg-[#f5f9ff] transition-colors">
        <button onClick={onClick} className="text-left">
          <span className="text-[14px] text-[#337ab7] hover:underline font-medium">
            {exam.title ?? `Exam #${exam.id}`}
          </span>
          {!attempted && (
            <span className="ml-2 text-[11px] text-[#888] bg-[#f5f5f5] border border-[#ddd] px-1.5 py-0.5 rounded-sm">
              Not attempted
            </span>
          )}
        </button>
        <div>
          <span
            className={cn(
              "text-[12px] px-2 py-0.5 rounded-sm border font-medium",
              exam.type === "MODEL"
                ? "bg-[#d9edf7] border-[#bce8f1] text-[#31708f]"
                : "bg-[#fcf8e3] border-[#faebcc] text-[#8a6d3b]",
            )}
          >
            {exam.type === "MODEL" ? "Model" : "Exit"}
          </span>
        </div>
        <div className="text-center text-[14px] text-[#555]">
          {exam.question_count}
        </div>
        <div className="text-center">
          {pct !== null ? (
            <span
              className={cn(
                "text-[13px] font-semibold",
                pct >= 50 ? "text-[#3c763d]" : "text-[#a94442]",
              )}
            >
              {attempt!.score} / {exam.question_count}{" "}
              <span className="font-normal text-[12px]">({pct}%)</span>
            </span>
          ) : attempted ? (
            <span className="text-[12px] text-[#888]">In progress</span>
          ) : (
            <span className="text-[12px] text-[#ccc]">—</span>
          )}
        </div>
        <div className="flex justify-center">
          {attempted && (
            <button
              onClick={onReview}
              className="text-[12px] px-2 py-1 border border-[#337ab7] text-[#337ab7] hover:bg-[#337ab7] hover:text-white transition-colors rounded-sm"
            >
              Review
            </button>
          )}
        </div>
        <button onClick={onClick} className="flex justify-end">
          <ChevronRight size={16} className="text-[#aaa]" />
        </button>
      </div>

      {/* Mobile row */}
      <div className="flex md:hidden w-full px-4 py-3 items-center gap-3 hover:bg-[#f5f9ff] transition-colors">
        <button onClick={onClick} className="flex-1 min-w-0 text-left">
          <div className="text-[14px] text-[#337ab7] font-medium truncate">
            {exam.title ?? `Exam #${exam.id}`}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-sm border",
                exam.type === "MODEL"
                  ? "bg-[#d9edf7] border-[#bce8f1] text-[#31708f]"
                  : "bg-[#fcf8e3] border-[#faebcc] text-[#8a6d3b]",
              )}
            >
              {exam.type === "MODEL" ? "Model" : "Exit"}
            </span>
            <span className="text-[12px] text-[#888]">
              {exam.question_count} questions
            </span>
            {pct !== null && (
              <span
                className={cn(
                  "text-[12px] font-semibold",
                  pct >= 50 ? "text-[#3c763d]" : "text-[#a94442]",
                )}
              >
                {attempt!.score}/{exam.question_count} ({pct}%)
              </span>
            )}
            {!attempted && (
              <span className="text-[11px] text-[#888]">Not attempted</span>
            )}
          </div>
        </button>
        {attempted && (
          <button
            onClick={onReview}
            className="text-[12px] px-2 py-1 border border-[#337ab7] text-[#337ab7] hover:bg-[#337ab7] hover:text-white transition-colors rounded-sm shrink-0"
          >
            Review
          </button>
        )}
        <button onClick={onClick}>
          <ChevronRight size={16} className="text-[#aaa] shrink-0" />
        </button>
      </div>
    </>
  );
}
