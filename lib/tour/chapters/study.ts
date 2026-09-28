import type { TourChapter } from "./types";

/** The three practice modes and Stories. */
export const STUDY_CHAPTERS = [
  {
    id: "review",
    route: "/jargon/review",
    steps: [
      {
        target: "review-collection",
        title: "Pick what to review",
        body: "Review one collection or all of them. Turn on “Remember on this device” to keep your pick.",
      },
      {
        target: "review-card",
        title: "Recall, then reveal",
        body: "Think of what the term means, then click the card or press Enter. Arrow keys move between cards.",
        bodyTouch:
          "Think of what the term means, then tap the card or swipe up. Swipe left or right to move between cards.",
        advanceOnTarget: "review-grades",
      },
      {
        target: "review-grades",
        title: "How well did you recall it?",
        body: "Again if you blanked, Hard if it was a struggle, Good if it came back, Easy if it was instant. New terms come first, so Again is normal early on.",
      },
    ],
  },
  {
    id: "read",
    route: "/jargon/read",
    steps: [
      {
        target: "read-card",
        title: "Guess, then reveal",
        body: "Take a guess before you reveal the definition. Every term you read counts toward learning it.",
      },
      {
        target: "read-modes",
        title: "Cards or Stories",
        body: "Cards shows one term at a time. Stories weaves your next terms into a short piece of reading.",
      },
      {
        target: "read-options",
        title: "Read your way",
        body: "Show definitions right away, hide the question, or open Stories by default.",
      },
    ],
  },
  {
    id: "read-more",
    route: "/jargon/read",
    steps: [
      {
        target: "read-collection",
        title: "Choose what to read",
        body: "Read from one collection or all of them. The count shows how many terms are ready.",
      },
      {
        target: "read-focus",
        title: "Focus mode",
        body: "A full-screen feed of cards you scroll through. Each card counts as read when it comes into view. Press Esc to leave.",
        bodyTouch:
          "A full-screen feed of cards you scroll through. Each card counts as read when it comes into view.",
      },
    ],
  },
  {
    id: "stories",
    route: "/jargon/read/stories",
    steps: [
      {
        target: "stories-level",
        title: "Shape your story",
        body: "Choose how much help you get with terms, the language level, and the length.",
      },
      {
        target: "stories-write",
        title: "Write it",
        body: "Your AI provider writes the piece. Click a highlighted term for its definition, and mark the story read to count a read for every term in it.",
        bodyTouch:
          "Your AI provider writes the piece. Tap a highlighted term for its definition, and mark the story read to count a read for every term in it.",
        placement: "top",
      },
    ],
  },
  {
    id: "quiz",
    route: "/jargon/quiz",
    steps: [
      {
        target: "quiz-style",
        title: "Simple or AI",
        body: "Simple quizzes use your own definitions and examples. AI writes fresh questions and needs your API key in Settings.",
      },
      {
        target: "quiz-count",
        title: "Size your quiz",
        body: "Pick a collection and how many questions. Quiz starts with the terms most at risk of slipping.",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
