export type StoryGenerationFailure = "markup" | "title" | "length" | "terms";

/** A reply that can't become a story (too few terms, wrong length, broken
 *  markup). A second attempt can plausibly fix it, so it triggers the retry.
 *  `reason` says which check failed, so retries can be counted by cause. */
export class StoryGenerationError extends Error {
  name = "StoryGenerationError";

  constructor(
    message: string,
    readonly reason: StoryGenerationFailure,
  ) {
    super(message);
  }
}
