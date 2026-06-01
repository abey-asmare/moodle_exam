import { Subject } from "../app/generated/prisma/client";

/**
 * Keyword → Subject mapping.
 * The first match wins, so keep specific keywords before more generic ones if needed.
 * All searches are case‑insensitive.
 */
export const keywordSubjectMap: { subject: Subject; keywords: string[] }[] = [
  {
    subject: Subject.PROJECT_MANAGEMENT, // or Subject.PM if you renamed it
    keywords: [
      // Waterfall / Traditional PM
      "waterfall",
      "sdlc",
      "project charter",
      "project management plan",
      "scope creep",
      "wbs",
      "work breakdown structure",
      "gantt chart",
      "pert chart",
      "critical path",
      "project baseline",
      "iron triangle",
      "triple constraint",
      "raci",
      "raci matrix",
      "stakeholder",
      "lessons learned",
      "risk management",
      "mitigation",
      "risk register",
      "scope verification",
      "scope management",
      "time management",
      "cost management",
      "quality management",
      "procurement",
      "earned value",
      "project life cycle",
      "phase",

      // Agile / Scrum
      "agile",
      "scrum",
      "sprint",
      "product backlog",
      "sprint backlog",
      "scrum master",
      "product owner",
      "development team",
      "daily stand‑up",
      "daily scrum",
      "sprint retrospective",
      "sprint review",
      "burn‑down chart",
      "velocity",
      "story points",
      "user story",
      "agile manifesto",
      "kanban",
      "extreme programming",
      "xp",
      "scrum events",
      "time‑boxed",

      // General PM
      "project manager",
      "project management",
      "project",
      "milestone",
      "deliverable",
      "kick‑off meeting",
      "feasibility study",
      "business case",
      "lessons learned",
      "contingency",
      "change request",
      "change control board",

      // Specific phrases from our question set
      "cone of uncertainty",
      "not a typical responsibility",
      "not a phase in the traditional waterfall model",
      "responsible for maximizing the value",
      "purpose of a sprint retrospective",
      "formally authorizes the existence of a project",
      "main role of the scrum master",
      "methodology uses iterative development",
      "not an agile framework",
      "burn-down chart shows",
      "process of identifying, analyzing, and responding",
      "knowledge area in pmbok",
      "purpose of a daily stand‑up meeting",
      "risk management, a ‘mitigation’ strategy",
      "project management tool",
    ],
  },
];
