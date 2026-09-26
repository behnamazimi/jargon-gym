/** A reply that can't become a story (too few terms, wrong length, broken
 *  markup). A second attempt can plausibly fix it, so it triggers the retry. */
export class StoryGenerationError extends Error {}
