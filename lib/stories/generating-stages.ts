/** What the "Writing your story" screen says while it waits, and when each line
 *  starts. Only the model call is slow, so these follow typical timing rather than
 *  reported progress. The story time limit is 59 s, so the last line comes well before it. */
export const GENERATING_STAGES = [
  { startsAtSeconds: 0, text: "Picking terms from your reading queue" },
  { startsAtSeconds: 4, text: "Choosing a style and a setting" },
  { startsAtSeconds: 6, text: "Drafting the story" },
  { startsAtSeconds: 12, text: "Working your terms in" },
  { startsAtSeconds: 20, text: "Checking that every term fits" },
  { startsAtSeconds: 28, text: "Almost there" },
  { startsAtSeconds: 40, text: "Taking a little longer than usual…" },
] as const;
