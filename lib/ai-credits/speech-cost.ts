/** What a speech provider charges, in micro-dollars (millionths of a dollar).
 *  An estimate from published rates; check it against invoices. */

/** Murf charges about $0.01 per 1,000 characters. ElevenLabs' rate isn't known
 *  here, so a clip it made has no cost to record (null). */
export function speechCostMicroUsd(provider: "murf" | "elevenlabs", characters: number) {
  return provider === "murf" ? characters * 10 : null;
}
