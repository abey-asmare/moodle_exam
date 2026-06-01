export type Subject =
  | "PROGRAMMING"
  | "DATA_STRUCTURES_ALGORITHMS"
  | "OOP"
  | "WEB_PROGRAMMING"
  | "MOBILE_DEVELOPMENT"
  | "DATABASE_SYSTEMS"
  | "OPERATING_SYSTEMS"
  | "SOFTWARE_ENGINEERING"
  | "REQUIREMENTS_ENGINEERING"
  | "ARCHITECTURE_DESIGN"
  | "PROJECT_MANAGEMENT"
  | "TESTING_QA"
  | "EVOLUTION_MAINTENANCE"
  | "NETWORKING"
  | "AI_ML";

export const SUBJECT_LABELS: Record<Subject, string> = {
  PROGRAMMING: "Programming",
  DATA_STRUCTURES_ALGORITHMS: "Data Structures & Algorithms",
  OOP: "Object-Oriented Programming",
  WEB_PROGRAMMING: "Web Programming",
  MOBILE_DEVELOPMENT: "Mobile Development",
  DATABASE_SYSTEMS: "Database Systems",
  OPERATING_SYSTEMS: "Operating Systems",
  SOFTWARE_ENGINEERING: "Software Engineering",
  REQUIREMENTS_ENGINEERING: "Requirements Engineering",
  ARCHITECTURE_DESIGN: "Architecture & Design",
  PROJECT_MANAGEMENT: "Project Management",
  TESTING_QA: "Testing & QA",
  EVOLUTION_MAINTENANCE: "Evolution & Maintenance",
  NETWORKING: "Networking",
  AI_ML: "AI & Machine Learning",
};

export type SafeChoice = { id: number; choice_text: string };
export type SafeQuestion = {
  id: number;
  text: string;
  subject: Subject;
  is_flagged: boolean;
  choices: SafeChoice[];
};
export type SafeExam = {
  id: number;
  title: string | null;
  questions: SafeQuestion[];
};
export type AttemptAnswer = {
  question_id: number;
  selected_choice_id: number | null;
  is_correct: boolean | null;
};
export type ScoredQuestion = SafeQuestion & { answer_id: number };
export type ExamAttempt = {
  id: number;
  started_at: string ;
  finished_at: string | null;
  score: number | null;
  answers: AttemptAnswer[];
};
export type Phase = "start" | "exam" | "result" | "review";
