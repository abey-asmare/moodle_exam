import { SafeExam } from "@/lib/types";


function MoodleShell({
  exam,
  children,
}: {
  exam: SafeExam;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white font-sans text-[#333]">
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
          {exam.title ?? "Software Engineering"}
        </h1>
        <div className="text-[13px] text-[#777] mt-0.5">
          {exam.questions.length} questions
        </div>
      </div>
      {children}
    </div>
  );
}


export default MoodleShell