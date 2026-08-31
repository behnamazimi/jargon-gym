# Smart review queue

How Jargon Gym chooses the next term. Short version: it doesn't rank
anything — Read, Review, and Quiz each draw a uniform random sample from
their eligible pool. There is no scoring, no staleness/cooldown decay, no
streak-based boosts, no cross-activity fail propagation, and no mastery-tier
concept. A prior scoring algorithm lived here; it's been fully removed to
make room for a new one, not yet designed.

## Pools

- **Read** draws from the unknown pool (terms not yet marked known). If that
  pool is empty and Read settings has the known-term fallback on, it falls
  back to a random draw from the known pool instead.
- **Review** draws from the unknown and known pools combined into one set,
  sampled uniformly — there's no fixed known:unknown ratio.
- **Quiz** draws from the known pool only — it's a check on terms you've
  already marked known, never a way to learn unknown ones.

## Selection

Every pick is `pickRandom(candidates, limit)` in
[`lib/smart-queue/pick.ts`](/lib/smart-queue/pick.ts): a Fisher–Yates
shuffle-and-slice, nothing more. `originOf(candidate)` derives which pool a
term came from off its `knownAt` field, for Review's per-term flip direction
when rating — that's the only per-candidate logic left.

## Pool stats

`computePoolStats` reports plain counts only: `unseen` (never engaged in
this context), `seen`, `total`, and `allSeenOnce`. There's no `stale`,
`recent`, or `struggling` bucket — those required the deleted
staleness-threshold and streak-sign machinery.

## Surfaces

- `/jargon/debug` and `/jargon/mastery` stay in the app as presentational
  shells — they show the plain candidate pool / plain known-vs-total counts,
  with no score, reasons, or mastery tiers to display until a new algorithm
  exists.
- The former "next best action" hint system (pace/staleness nudges on the
  collection page) has been removed entirely — it existed solely to surface
  staleness signals that no longer exist.
