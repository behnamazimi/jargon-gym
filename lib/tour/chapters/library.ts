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
        body: "Start by adding a collection someone else shared. It takes one tap.",
      },
      {
        target: "library-import",
        title: "Or bring your own",
        body: "Have your own list of terms? Import it as JSON.",
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
        body: "Everything you've added lives here. Pick one to see its terms and progress.",
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
        body: "Search terms and definitions, or press / to jump here. Filters narrow by category or hide terms you know.",
        bodyTouch:
          "Search terms and definitions. Filters narrow by category or hide terms you know.",
      },
      {
        target: "library-term",
        title: "Already know one?",
        body: "Hover a term and click the check to mark it known, so practice skips it. Click a term to expand it.",
        bodyTouch:
          "Swipe a term left to mark it known, so practice skips it. Tap a term to expand it.",
      },
      {
        target: "library-actions",
        title: "Collection settings",
        body: "Pause a collection to take it out of Read, Review, and Quiz for a while, export it as JSON, or remove it.",
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
        body: "It grows each day you practice. Open it to see your last week.",
      },
      {
        target: "app-account",
        title: "Everything else",
        body: "Browse shared collections, import your own, track Mastery, and open Settings from here.",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
