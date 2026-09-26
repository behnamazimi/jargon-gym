/** Toast shown after a like/dislike vote, saying what it changes. */
export function voteFeedback(vote: -1 | 1 | null): string {
  switch (vote) {
    case 1:
      return "Liked. You'll get more stories in this style.";
    case -1:
      return "Got it. You'll get fewer stories in this style.";
    default:
      return "Vote removed.";
  }
}
