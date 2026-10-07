import type { TourChapter } from "./types";

/** Progress and the pages reached from the More menu. */
export const MORE_CHAPTERS = [
  {
    id: "triage",
    route: "/app/triage",
    steps: [
      {
        target: "triage-card",
        title: "Sort what you know",
        body: "Press → if you know it, ← if not yet. Reveal it first if needed.",
        bodyTouch: "Swipe right if you know it, left if not yet. Tap to reveal.",
      },
      {
        target: "triage-actions",
        title: "Nothing is final",
        body: "Terms you know skip practice. Not yet keeps them in your queue. Undo reverses your last choice.",
        placement: "top",
      },
    ],
  },
  {
    id: "browse",
    route: "/app/browse",
    steps: [
      {
        target: "browse-filters",
        title: "Browse collections",
        body: "Switch between built-in and community collections, then search.",
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
    route: "/app/import",
    steps: [
      {
        target: "import-search",
        title: "Search first",
        body: "Collections you can add in one tap.",
      },
      {
        target: "import-routes",
        title: "Or add your own",
        body: "Paste a list, export from another app and paste it, save one term, or start empty.",
      },
    ],
  },
  {
    id: "settings",
    route: "/app/settings",
    steps: [
      {
        target: "settings-ai",
        title: "Unlock AI features",
        body: "Use AI credits for AI quizzes and Stories, or add your own API key.",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
