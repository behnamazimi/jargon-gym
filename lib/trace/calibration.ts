/** Calibration — diagnostic math over `review_events` rows, for the debug
 *  page's Calibration view. This is analysis *of* TRACE's output, not part
 *  of the live scoring path: nothing here should ever be imported by
 *  review-outcome.ts or the ranking functions in queue.ts. It answers
 *  questions review_state's live-only design can't — does predicted
 *  retrievability track actual outcomes, and how often does a Review
 *  reveal go ungraded — using the append-only log added in
 *  supabase/migrations/20260901140000_review_events_log.sql.
 *  @see docs/trace.md
 */

export * from "./calibration-buckets";
export * from "./calibration-activity";
