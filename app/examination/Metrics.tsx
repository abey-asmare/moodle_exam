// Add to your types at the top
// (ExamSummary already has everything needed)

import { cn } from "@/lib/utils";

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

function MetricsPanel({ exams }: { exams: ExamSummary[] }) {
  const total = exams.length;
  const attempted = exams.filter((e) => e.last_attempt?.finished_at != null);
  const unattempted = total - attempted.length;
  const models = exams.filter((e) => e.type === "MODEL");
  const exits = exams.filter((e) => e.type === "EXIT");
  const attemptedModels = models.filter((e) => e.last_attempt?.finished_at).length;
  const attemptedExits = exits.filter((e) => e.last_attempt?.finished_at).length;

  const scores = attempted
    .filter((e) => e.last_attempt?.score != null)
    .map((e) => ({
      score: e.last_attempt!.score!,
      total: e.question_count,
      pct: Math.round((e.last_attempt!.score! / e.question_count) * 100),
    }));

  const avgPct = scores.length
    ? Math.round(scores.reduce((a, b) => a + b.pct, 0) / scores.length)
    : null;
  const best = scores.length
    ? scores.reduce((a, b) => (b.pct > a.pct ? b : a))
    : null;
  const passing = scores.filter((s) => s.pct >= 50).length;
  const totalQs = exams.reduce((a, e) => a + e.question_count, 0);
  const answeredQs = attempted.reduce((a, e) => a + e.question_count, 0);

  function pct(n: number, t: number) {
    return t === 0 ? 0 : Math.round((n / t) * 100);
  }

  const scoreColor =
    avgPct == null ? "text-[#555]"
    : avgPct >= 60 ? "text-[#3c763d]"
    : avgPct >= 40 ? "text-[#8a6d3b]"
    : "text-[#a94442]";

  if (total === 0) return null;

  return (
    <section>
      <h2 className="text-[15px] font-semibold text-[#333] mb-3 border-b border-[#ddd] pb-2">
        Your progress
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {[
          { label: "Total exams", value: String(total), sub: `${models.length} model · ${exits.length} exit` },
          { label: "Attempted", value: String(attempted.length), sub: `${pct(attempted.length, total)}% of all` },
          { label: "Not started", value: String(unattempted), sub: `${pct(unattempted, total)}% remaining` },
          { label: "Avg score", value: avgPct != null ? `${avgPct}%` : "—", sub: `${scores.length} scored`, valueClass: scoreColor },
          { label: "Pass rate", value: scores.length ? `${pct(passing, scores.length)}%` : "—", sub: `${passing}/${scores.length} passed` },
          { label: "Best score", value: best ? `${best.pct}%` : "—", sub: best ? `${best.score}/${best.total} qs` : "", valueClass: "text-[#3c763d]" },
        ].map(({ label, value, sub, valueClass }) => (
          <div key={label} className="bg-[#f9f9f9] border border-[#eee] rounded-sm px-3 py-3">
            <div className="text-[11px] text-[#888] mb-1">{label}</div>
            <div className={cn("text-[22px] font-semibold leading-tight", valueClass ?? "text-[#333]")}>{value}</div>
            <div className="text-[11px] text-[#aaa] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Breakdown bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Progress by type */}
        <div className="border border-[#eee] bg-[#f9f9f9] px-4 py-3">
          <div className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-3">
            Progress by type
          </div>
          {[
            { label: "Model", done: attemptedModels, total: models.length, color: "bg-[#337ab7]" },
            { label: "Exit", done: attemptedExits, total: exits.length, color: "bg-[#f0ad4e]" },
            { label: "Questions seen", done: answeredQs, total: totalQs, color: "bg-[#5cb85c]" },
          ].map(({ label, done, total: t, color }) => (
            <div key={label} className="flex items-center gap-3 mb-2">
              <span className="text-[12px] text-[#666] w-[100px] shrink-0">{label}</span>
              <div className="flex-1 h-[6px] bg-[#e8e8e8] rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct(done, t)}%` }} />
              </div>
              <span className="text-[11px] text-[#aaa] w-[40px] text-right">{done}/{t}</span>
            </div>
          ))}
        </div>

        {/* Score distribution */}
        <div className="border border-[#eee] bg-[#f9f9f9] px-4 py-3">
          <div className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-3">
            Score distribution
          </div>
          {scores.length === 0 ? (
            <p className="text-[13px] text-[#aaa]">No scored exams yet.</p>
          ) : (
            [
              { label: "≥ 80%", count: scores.filter((s) => s.pct >= 80).length, color: "bg-[#1D9E75]" },
              { label: "60–79%", count: scores.filter((s) => s.pct >= 60 && s.pct < 80).length, color: "bg-[#5cb85c]" },
              { label: "40–59%", count: scores.filter((s) => s.pct >= 40 && s.pct < 60).length, color: "bg-[#f0ad4e]" },
              { label: "< 40%", count: scores.filter((s) => s.pct < 40).length, color: "bg-[#d9534f]" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3 mb-2">
                <span className="text-[12px] text-[#666] w-[52px] shrink-0">{label}</span>
                <div className="flex-1 h-[6px] bg-[#e8e8e8] rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", color)} style={{ width: `${pct(count, scores.length)}%` }} />
                </div>
                <span className="text-[11px] text-[#aaa] w-[24px] text-right">{count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default MetricsPanel