import type { TourChapter } from "./types";

/** The app's four sections and what each is for, pointed at one by one in
 *  the dock (phone) or header (desktop). Runs first, on whichever of those
 *  pages a new account reaches first. */
export const OVERVIEW_CHAPTERS = [
  {
    id: "overview",
    route: ["/jargon", "/jargon/read", "/jargon/review", "/jargon/quiz"],
    steps: [
      {
        target: "nav-library",
        title: "Library: your terms",
        body: "Every collection you've added and all its terms. Add collections, search terms, and mark the ones you already know.",
        placement: "top",
      },
      {
        target: "nav-read",
        title: "Read: meet new terms",
        body: "Guess what a term means, then reveal it. Nothing is graded, so it's the easy way to get to know new terms.",
        placement: "top",
      },
      {
        target: "nav-review",
        title: "Review: recall them",
        body: "See a term, recall its meaning from memory, then rate how well you did. The terms you're weakest on come up first.",
        placement: "top",
      },
      {
        target: "nav-quiz",
        title: "Quiz: test yourself",
        body: "Multiple-choice and true/false questions that check you can tell similar terms apart.",
        placement: "top",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
