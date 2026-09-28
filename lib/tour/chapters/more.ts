import type { TourChapter } from "./types";

/** Progress and the pages reached from the More menu. */
export const MORE_CHAPTERS = [
  {
    id: "mastery",
    route: "/jargon/mastery",
    steps: [
      {
        target: "mastery-summary",
        title: "Learning and mastered",
        body: "A term is learning once you've read, reviewed, or quizzed it. It's mastered once Review and Quiz show you recall it reliably, or when you mark it known. Reading alone won't master it.",
      },
      {
        target: "mastery-collection",
        title: "Each collection",
        body: "See how far along each collection is. Open one to see its terms, or Practice to review it.",
      },
      {
        target: "mastery-tabs",
        title: "Every term",
        body: "Terms lists each term with how well you know it.",
      },
    ],
  },
  {
    id: "triage",
    route: "/jargon/triage",
    steps: [
      {
        target: "triage-card",
        title: "Sort what you know",
        body: "Reveal a term if you need to, then press → if you knew it or ← if not yet.",
        bodyTouch: "Swipe right if you knew it, left if not yet. Tap to reveal the definition.",
      },
      {
        target: "triage-actions",
        title: "Nothing is final",
        body: "Terms you knew are marked known and skip practice. Not yet keeps them in your queue. Undo takes back your last choice.",
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
        body: "Search and filter collections other people have shared.",
      },
      {
        target: "browse-add",
        title: "Add one",
        body: "Adding a collection puts its terms into your practice. You can remove it any time.",
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
        body: "Paste glossary JSON or upload a .json file. No file yet? The AI skill above can generate one.",
      },
      {
        target: "import-validate",
        title: "Check before importing",
        body: "Validate the file and preview its terms. Nothing is saved until you confirm.",
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
        body: "Add your own AI provider and API key to use AI quizzes and Stories.",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
