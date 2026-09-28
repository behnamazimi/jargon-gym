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
        title: "Read: get familiar",
        body: "Read terms and their definitions. It's input, not a test: every term you read builds familiarity and gives it a head start in Review.",
        placement: "top",
      },
      {
        target: "nav-review",
        title: "Review: recall them",
        body: "See a term, recall its meaning from memory, then rate how well you did. New terms come first, then the ones you're closest to forgetting.",
        placement: "top",
      },
      {
        target: "nav-quiz",
        title: "Quiz: test yourself",
        body: "Check what you know with a quick quiz. There are two ways to take one: Simple, or smarter questions written by AI.",
        placement: "top",
      },
    ],
  },
] as const satisfies readonly TourChapter[];
