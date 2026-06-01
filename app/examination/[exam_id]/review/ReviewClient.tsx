import { ExamAttempt, SafeExam, ScoredQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import MoodleShell from "../MoodleShell";

function ReviewClient({
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

export default ReviewClient;
