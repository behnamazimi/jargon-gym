import type { TourChapter } from "./types";

/** Library, the first stop for a new account, plus the app-wide chrome. */
export const LIBRARY_CHAPTERS = [
  {
    id: "welcome",
    route: "/app/library",
    steps: [
      {
        target: "library-browse",
        title: "Welcome to Lobyas",
        body: "Add a collection to get started.",
      },
      {
        target: "library-import",
        title: "Add your own",
        body: "Paste a list, export from another app and paste it, or start empty.",
      },
    ],
  },
  {
    id: "library",
    route: "/app/library",
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
    route: "/app/library",
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
        bodyTouch: "Swipe right to mark a term known and skip it in practice.",
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
    route: "/app/library",
    // Not on an empty Library: the header's tips would open before the welcome tip.
    after: ["library"],
    steps: [
      {
        target: "app-streak",
        title: "Your streak",
        body: "An optional streak counts the days you practice. Open it to see your week.",
      },
      {
        target: "app-account",
        title: "Everything else",
        body: "Browse collections, add your own, check Mastery, and open Settings.",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
