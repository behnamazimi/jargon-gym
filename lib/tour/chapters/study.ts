import type { TourChapter } from "./types";

/** The three practice modes and Stories. */
export const STUDY_CHAPTERS = [
  {
    id: "review",
    route: "/app/review",
    steps: [
      {
        target: "review-collection",
        title: "Pick what to review",
        body: "Review one collection or all of them.",
      },
      {
        target: "review-card",
        title: "Recall, then reveal",
        body: "Recall the meaning, then click the card or press Enter.",
        bodyTouch: "Recall the meaning, then tap the card or swipe up.",
        advanceOnTarget: "review-grades",
      },
      {
        target: "review-grades",
        title: "How well did you recall it?",
        body: "Again if you blanked, Hard if it was a struggle, Good if it came back, Easy if it was instant.",
      },
    ],
  },
  {
    id: "read",
    route: "/app/read",
    steps: [
      {
        target: "read-card",
        title: "Read to get familiar",
        body: "Just read. Every term you read builds familiarity for Review.",
      },
      {
        target: "read-modes",
        title: "Cards or Stories",
        body: "Cards: one term at a time. Stories: terms in a short read.",
      },
      {
        target: "read-options",
        title: "Read your way",
        body: "Show definitions right away, or open Stories by default.",
      },
    ],
  },
  {
    id: "read-more",
    route: "/app/read",
    steps: [
      {
        target: "read-collection",
        title: "Choose what to read",
        body: "Read one collection or all of them.",
      },
    ],
  },
  {
    id: "stories",
    route: "/app/read/stories",
    steps: [
      {
        target: "stories-level",
        title: "Sentence difficulty",
        body: "Pick how hard the sentences are.",
      },
      {
        target: "stories-write",
        title: "Write it",
        body: "Writes a short story with your next terms. Click one for its definition.",
        bodyTouch: "Writes a short story with your next terms. Tap one for its definition.",
        placement: "top",
      },
    ],
  },
  {
    id: "quiz",
    route: "/app/quiz",
    steps: [
      {
        target: "quiz-style",
        title: "Simple or AI",
        body: "Simple uses your definitions. AI writes fresh questions.",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
