import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";

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

export default QuestionInfoBlock;
