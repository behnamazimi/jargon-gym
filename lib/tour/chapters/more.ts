import type { TourChapter } from "./types";

/** Progress and the pages reached from the More menu. */
export const MORE_CHAPTERS = [
  {
    id: "triage",
    route: "/jargon/triage",
    steps: [
      {
        target: "triage-card",
        title: "Sort what you know",
        body: "Press → if you knew it, ← if not yet. Reveal it first if needed.",
        bodyTouch: "Swipe right if you knew it, left if not yet. Tap to reveal.",
      },
      {
        target: "triage-actions",
        title: "Nothing is final",
        body: "Known terms skip practice. Not yet keeps them in your queue. Undo reverses your last choice.",
        placement: "top",
      },
    ],
  },
  {
    id: "browse",
    route: "/jargon/browse",
    steps: [
      {
        target: "browse-filters",
        title: "Shared collections",
        body: "Search collections other people have shared.",
      },
      {
        target: "browse-add",
        title: "Add one",
        body: "Adds its terms to your practice. You can remove it any time.",
      },
    ],
  },
  {
    id: "import",
    route: "/jargon/import",
    steps: [
      {
        target: "import-json",
        title: "Bring your own terms",
        body: "Paste JSON or upload a .json file. No file? The AI skill above can make one.",
      },
      {
        target: "import-validate",
        title: "Check before importing",
        body: "Preview the terms first. Nothing saves until you confirm.",
      },
    ],
  },
  {
    id: "settings",
    route: "/jargon/settings",
    steps: [
      {
        target: "settings-ai",
        title: "Unlock AI features",
        body: "Use AI credits for AI quizzes and Stories, or add your own API key.",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
