/** Shared hyperbolic decay curve, used by both familiarity decay (§3) and
 *  retrievability (§4/§5): value(t) = value₀ / (1 + t / scale).
 *
 *  Same shape, two different scales — familiarity decays over
 *  FAMILIARITY_DECAY_SCALE_DAYS, retrievability over 9·S (stability-scaled),
 *  so callers pass their own `scale` rather than this module picking one. */
export function hyperbolicDecay(initialValue: number, elapsedDays: number, scale: number): number {
  if (elapsedDays <= 0) return initialValue;
  return initialValue / (1 + elapsedDays / scale);
}

/** Days between two instants, floored at 0 (never negative — a clock skew
 *  or same-instant call should decay nothing, not invert the curve). */
export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}
