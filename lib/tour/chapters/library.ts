import type { TourChapter } from "./types";

/** Library, the first stop for a new account, plus the app-wide chrome. */
export const LIBRARY_CHAPTERS = [
  {
    id: "welcome",
    route: "/jargon",
    steps: [
      {
        target: "library-browse",
        title: "Welcome to Jargon Gym",
        body: "Add a shared collection to get started.",
      },
      {
        target: "library-import",
        title: "Or bring your own",
        body: "Got your own terms? Import them as JSON.",
      },
    ],
  },
  {
    id: "library",
    route: "/jargon",
    steps: [
      {
        target: "library-collections",
        title: "Your collections",
        body: "Pick one to see its terms and progress.",
      },
    ],
  },
  {
    id: "library-terms",
    route: "/jargon",
    steps: [
      {
        target: "library-search",
        title: "Find any term",
        body: "Search terms and definitions. Press / to jump here.",
        bodyTouch: "Search terms and definitions.",
      },
      {
        target: "library-term",
        title: "Already know one?",
        body: "Click the check to mark a term known and skip it in practice.",
        bodyTouch: "Swipe left to mark a term known and skip it in practice.",
      },
      {
        target: "library-actions",
        title: "Collection settings",
        body: "Pause, export, or remove this collection.",
      },
    ],
  },
  {
    id: "app",
    route: "/jargon",
    steps: [
      {
        target: "app-streak",
        title: "Your streak",
        body: "Practice daily to grow it. Open it to see your week.",
      },
      {
        target: "app-account",
        title: "Everything else",
        body: "Browse collections, import, check Mastery, and open Settings.",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
