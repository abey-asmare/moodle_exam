import { SafeQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";


function QuizNavigation(
 {questions, answers, currentQ, flagged, setCurrentQ, submitting, handleSubmit}: {

  
 questions: SafeQuestion[],
  answers: Record<number, number | null>,
  currentQ: number,
  flagged: Set<number>,
  setCurrentQ: (idx: number) => void,
  submitting: boolean,
  handleSubmit: (_auto?: boolean) => Promise<void>,
 }
) {
  return (
    <div className="mx-3 mb-6">
      <h3 className="text-[16px] font-bold text-[#333] mb-3">
        Quiz navigation
      </h3>
      <div className="grid grid-cols-8 gap-1 mb-3">
        {questions.map((question, idx) => {
          const isAnswered =
            answers[question.id] !== null && answers[question.id] !== undefined;
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
  );
}


export default QuizNavigation