/** Ahead-buffer for the live Review feed. Not a session length — TRACE
 *  still ranks the full pool on each pick; this only caps how many winners
 *  we hydrate and how soon we ask again. */
export const REVIEW_QUEUE_BUFFER_SIZE = 6;

export const REVIEW_QUEUE_PREFETCH_REMAINING = REVIEW_QUEUE_BUFFER_SIZE / 2;
