import { Prisma, Subject, Type } from "@/app/generated/prisma/client"

const a = [{
    subject: "AI_ML",
    from: "St. Mary's University College",
    text: "Which technique enables computers to learn from experience and improve performance?",
    choices: [
      "Artificial neural networks",
      "Genetic algorithms",
      "Reinforcement learning",
      "Expert systems",
    ],
    correctIndex: 2,
  },]



type Question  = {
  subject: Subject, from?: string, text: string, choices: string[], correctIndex:number, type?: Type, 
}

const questions: Question[] = [...a]
export default questions