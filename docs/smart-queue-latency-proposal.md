# Proposal: time-on-term as a scoring signal

**Status:** proposal, not implemented. Scoped to the latency/time-on-term idea
only — earlier design-discussion rounds explored other directions (LLM-graded
free response, a `term_relationships` confidence-propagation model, a
confusability "Arena" mode, context-anticipated delivery) that are **not**
covered here and are not assumed as prerequisites, except where noted below
as an optional phase-2 hook.

This assumes familiarity with [`docs/smart-queue.md`](./smart-queue.md) —
the current scoring model, `PickContext` split, and file layout it describes
aren't re-explained here, only the delta this proposal adds on top of it.

---

## Motivation

Every signal in the current scoring model (`lib/smart-queue/score.ts`) is
derived from correctness: pass/fail, streak sign, lifetime fail rate. Two
answers with identical correctness — one instant, one a 20-second struggle —
score identically today. Latency is a continuous, fully passive signal
(nothing new for the user to *do*) that's orthogonal to correctness, and it
turns out to sharpen several existing mechanisms rather than requiring new
ones bolted on the side.

---

## What to capture, per surface

Not one number — several distinct intervals, each answering a different
question:

- **Review — two intervals, not one:**
  - *Prompt shown → reveal requested*: retrieval effort — how long the user
    tried before giving up and looking at the answer. The closest direct
    measurement of the thing spaced practice is supposed to be strengthening.
  - *Reveal → rating submitted*: hesitation/double-checking while looking at
    the answer — a different signal from retrieval effort.
- **Quiz:** question shown → option selected. Confounded by option count and
  distractor reading time, so normalize by total option text length before
  comparing across questions.
- **Read:** active dwell time on the card, gated by the Page Visibility API
  so a backgrounded tab doesn't count as reading time. Worth building even
  in isolation: today `read_count` increments on open regardless of dwell,
  so rapid click-through of the Read queue is indistinguishable from actually
  reading — this closes that gap. A near-zero-dwell read shouldn't earn full
  exposure credit toward `engagedButUntestedBoost` / never-engaged clearing.
- **Widget:** whether a peeked term was advanced past quickly or lingered on
  before rotation/click-through. Same idea as Read dwell; cheaper to capture
  since the widget's local loop (`read-state.sh` / `state.json`) already
  tracks per-term state.

### Minimal schema footprint

```sql
alter table review_state add column pending_reveal_at timestamptz;
-- real timestamp captured at reveal, replacing the current inference
-- from updated_at (which isn't reliable once other fields change
-- concurrently)

alter table review_state add column review_latency_samples_ms smallint[] default '{}';
-- bounded rolling window (application logic caps it at ~5 entries),
-- not an unbounded event log
```

`shown_at` (prompt-shown / question-shown / card-mounted timestamp) is
captured client-side and passed into the existing reveal/answer write calls
(`recordReveal`, `applyQuizAnswer`, `applyReviewRating` in
[`lib/jargon/review-outcome.ts`](../lib/jargon/review-outcome.ts)) rather
than requiring a new event type.

**Honest cost:** `review_latency_samples_ms` is the first piece of this
system that needs bounded history rather than a single aggregate value —
`review_state` is otherwise a pure one-row-per-term aggregate (see
[Data model](./smart-queue.md#data-model)), and a small array column is a
real, if minor, departure from that shape.

---

## Normalization — required before any of this means anything

Raw milliseconds are close to meaningless. Four confounds have to be
controlled first. None of this is new machinery — it mirrors patterns
already in the codebase, just pointed at a new variable:

1. **Per-user, per-surface baseline.** Compare each latency to *this user's*
   rolling median *on this surface* — never an absolute/global threshold.
   Telegram typing speed and web reading speed aren't comparable.
2. **Content-length adjustment.** `latencyMs / definitionCharCount` (or
   similar) — a two-line definition and a two-paragraph one shouldn't share
   a clock.
3. **Session-position adjustment.** Rank latency against the current
   session's own median, not an absolute figure — recall is naturally
   slower late in a long session regardless of term difficulty.
4. **Outlier clipping.** Clip at some multiple of the personal median before
   it enters scoring — the same cap-then-tail shape
   `stalenessBoost`/`stalenessTailBoost` already use
   ([`lib/smart-queue/score.ts:34`](../lib/smart-queue/score.ts),
   [`:53`](../lib/smart-queue/score.ts)) — so a mid-review interruption
   doesn't register as "impossibly hard term."
5. **Cold start.** A term/user pair with 1-2 timed attempts has no reliable
   baseline. Mirror the Laplace-smoothing move `activitySubScore` already
   does for fail-rate confidence
   ([`lib/smart-queue/strength.ts:41`](../lib/smart-queue/strength.ts),
   via `OVERALL_FAIL_RATE_PRIOR_STRENGTH`/`OVERALL_FAIL_RATE_PRIOR_RATE` in
   [`lib/smart-queue/weights.ts`](../lib/smart-queue/weights.ts)) — blend
   real samples with virtual attempts at a neutral prior, applied to latency
   confidence instead of fail-rate confidence.

---

## The core idea: latency × correctness is a 2×2, and each quadrant wants different handling

|              | **Fast**                                     | **Slow**                                         |
| ------------ | --------------------------------------------- | ------------------------------------------------- |
| **Correct**  | Automatic — genuinely consolidated            | Effortful pass — correct but not yet reliable      |
| **Wrong**    | Confident misconception — a held wrong belief | Groping/blank — genuine uncertainty or decay      |

The bottom-left cell is the interesting one: a **fast wrong answer is worse
evidence than a slow wrong answer**, not equivalent. Slow-wrong looks like
ordinary forgetting, fixable with more repetition. Fast-wrong means the user
answered confidently and was still wrong — an actively incorrect mental
model that plain re-exposure won't fix, because they aren't hesitating; they
believe they already know it.

```ts
type LatencyQuadrant = "automatic" | "effortful_pass" | "confident_error" | "uncertain_error";

function classify(passed: boolean, normalizedLatency: number, w: LatencyThresholds): LatencyQuadrant {
  const fast = normalizedLatency < w.fastThreshold; // vs. this user's own baseline, post-normalization
  if (passed) return fast ? "automatic" : "effortful_pass";
  return fast ? "confident_error" : "uncertain_error";
}
```

Routing, concretely:

- `confident_error` → candidate for contrastive remediation next time this
  term comes up, rather than another plain recall card. *(This routing
  target assumes some form of confusability-pair remediation exists — a
  separate, not-yet-built mechanism from another design round. Treat as an
  optional phase-2 hook: the quadrant classification itself is useful and
  shippable without it — see [Phasing](#suggested-phasing).)*
- `uncertain_error` → ordinary `struggling` boost, unchanged from today.
- `effortful_pass` → shortened mastered-cooldown (next section).
- `automatic` → strongest evidence available; safe to extend cooldown
  further than streak length alone currently justifies.

---

## Integration point 1: refine the existing cooldown (highest value, lowest risk)

`masteredCooldownHours` ([`lib/smart-queue/weights.ts:76`](../lib/smart-queue/weights.ts))
currently scales purely off streak length — a white-knuckle correct answer
and an instant one earn the identical cooldown window at the same streak.
Add a latency-quality multiplier on top of the existing curve, don't replace
it:

```ts
function masteredCooldownHours(streak: number, quadrant: LatencyQuadrant): number {
  const hours = Math.min(
    MASTERED_COOLDOWN_BASE_HOURS * Math.pow(MASTERED_COOLDOWN_GROWTH_FACTOR, streak - 1),
    MASTERED_COOLDOWN_CAP_HOURS,
  );
  if (quadrant === "effortful_pass") return hours * 0.5; // don't trust it as long
  if (quadrant === "automatic") return Math.min(hours * 1.2, MASTERED_COOLDOWN_CAP_HOURS);
  return hours;
}
```

Called from `evaluateCandidate` ([`lib/smart-queue/score.ts:136`](../lib/smart-queue/score.ts)),
which already reads streak for this exact purpose — the call site changes,
the surrounding architecture doesn't.

## Integration point 2: a new mastery axis in `strength.ts`

`strengthForCandidate`/`computeOverallStrength` currently bucket
`unverified/weak/medium/strong` from streak, fail-rate, and staleness.
Speed is a genuinely separate dimension — a term can be `strong` (correct,
consistent) without being **automatic** (fast). Expose it as its own badge
rather than folding it into the existing 0-100 blend, the same way `fragile`
is tracked independently of streak sign rather than collapsed into it
(see [Lifetime fail rate](./smart-queue.md#lifetime-fail-rate-fragile)).
"Strong but effortful" and "strong and automatic" are different facts about
the same term.

## Integration point 3: latency trend — the one predictive capability here

Everything above uses a single latency sample. The bounded
`review_latency_samples_ms` array enables something none of the existing
pass/fail counters can do: flag decay **before** it produces a fail.

```ts
function latencyTrend(recent: number[]): "improving" | "plateaued" | "worsening" {
  if (recent.length < 3) return "plateaued";
  const half = Math.floor(recent.length / 2);
  const earlyAvg = average(recent.slice(0, half));
  const lateAvg = average(recent.slice(-half));
  const delta = (earlyAvg - lateAvg) / earlyAvg;
  if (delta > 0.15) return "improving";
  if (delta < -0.15) return "worsening";
  return "plateaued";
}
```

A term still passing but getting *slower* each time is a leading indicator —
streak positive, `fragile` not yet firing, staleness not yet ramped, and the
term is visibly degrading anyway. The current system is entirely reactive:
it can only respond after an actual `review_fail`/`quiz_fail`. This is the
one piece of the whole proposal that surfaces a problem before it manifests
as a failure.

---

## Suggested phasing

1. **Capture only** — add `pending_reveal_at`, thread `shown_at` through the
   existing write calls, start populating `review_latency_samples_ms`.
   Ships no behavior change; de-risks the schema/instrumentation work and
   starts building the personal baselines the rest of this depends on.
2. **Cooldown refinement** (integration point 1) — smallest, most contained
   behavior change; reuses an existing mechanism end to end.
3. **Trend flag** (integration point 3) — read-only surfacing first (a badge
   or debug-page column) before it drives any score change, to sanity-check
   the 0.15 thresholds against real data.
4. **Quadrant classification + `automatic` badge** (integration point 2) —
   once thresholds are validated in step 3.
5. **Confident-error routing** — deferred; depends on a remediation
   mechanism this doc doesn't build.

## Open questions / risks

- Threshold constants (`fastThreshold`, the 0.15 trend delta, the 0.5×/1.2×
  cooldown multipliers) are placeholders — need tuning against real
  latency distributions before they ship, not just picked once and left.
- Read dwell time is an inherently imperfect attention proxy (a visible,
  focused tab isn't proof of reading) — treat it as strictly better than
  `read_count` alone, not as a solved measurement.
- Quiz latency needs the option-count/text-length normalization to be right
  from the start, or it mostly measures distractor count, not comprehension.
- Cold-start terms (1-2 timed attempts) must stay unclassified rather than
  forced into a quadrant — same discipline `FAIL_RATE_MIN_ATTEMPTS` already
  enforces for `fragile`.
