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

/** m:ss for the audio controls; 0:00 for anything not yet known. */
export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
